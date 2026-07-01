/**
 * Script de prueba de estrés para el flujo de checkout.
 * Realiza solicitudes concurrentes al motor de checkout de órdenes y
 * mide la latencia, rendimiento (throughput), tasa de éxito y fallas.
 * 
 * Uso:
 *   npx tsx tests/checkout-stress.ts [opciones]
 * 
 * Opciones:
 *   --concurrency=N     Número de hilos concurrentes (por defecto: 10)
 *   --total=N           Número total de pedidos a crear (por defecto: 50)
 *   --payment-method=S  Método de pago a utilizar (por defecto: "pago_movil")
 * 
 * Ejemplo:
 *   npx tsx tests/checkout-stress.ts --concurrency=20 --total=100
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import crypto from "crypto";

async function main() {
  const { db } = await import("../src/db");
  const { categories, menuItems, dailyMenuItems, orders, customers, settings, exchangeRates } = await import("../src/db/schema");
  const { processCheckout } = await import("../src/services/order.service");
  const { eq, and, like } = await import("drizzle-orm");
  const args = process.argv.slice(2);
  const concurrency = parseInt(args.find(a => a.startsWith("--concurrency="))?.split("=")[1] || "10", 10);
  const total = parseInt(args.find(a => a.startsWith("--total="))?.split("=")[1] || "50", 10);
  const paymentMethod = args.find(a => a.startsWith("--payment-method="))?.split("=")[1] || "pago_movil";
  
  console.log(`--- Stress Testing Checkout Flow ---`);
  console.log(`Concurrency: ${concurrency}`);
  console.log(`Total requests: ${total}`);
  console.log(`Payment Method: ${paymentMethod}`);
  console.log(`Connecting to database...`);

  // Ensure settings & exchange rate exist
  const [dbSettings] = await db.select().from(settings).limit(1);
  if (!dbSettings) {
    console.error("Error: No settings row found in DB. Run seed first.");
    process.exit(1);
  }
  const [activeRate] = await db.select().from(exchangeRates).limit(1);
  if (!activeRate) {
    console.error("Error: No exchange rate row found in DB. Run seed first.");
    process.exit(1);
  }

  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
  }).format(new Date());

  let tempCategoryId: string | null = null;
  let tempMenuItemId: string | null = null;
  let tempDailyMenuId: string | null = null;

  let testItem: any = null;

  try {
    // Look for a valid category and menu item
    console.log("Locating suitable menu item for testing...");
    const availableItems = await db
      .select({
        id: menuItems.id,
        name: menuItems.name,
        priceUsdCents: menuItems.priceUsdCents,
        isPrepackaged: menuItems.isPrepackaged,
        categoryId: menuItems.categoryId,
        categoryAllowAlone: categories.allowAlone,
        categoryIsSimple: categories.isSimple,
        categoryName: categories.name,
      })
      .from(menuItems)
      .innerJoin(categories, eq(menuItems.categoryId, categories.id))
      .where(and(eq(menuItems.isAvailable, true), eq(categories.allowAlone, true), eq(categories.isAvailable, true)))
      .limit(1);

    if (availableItems.length > 0) {
      testItem = availableItems[0];
      console.log(`Using existing item: ${testItem.name} (ID: ${testItem.id})`);
      
      // Ensure it is in daily menu for today
      const [dailyItem] = await db
        .select()
        .from(dailyMenuItems)
        .where(and(eq(dailyMenuItems.menuItemId, testItem.id), eq(dailyMenuItems.date, todayStr)))
        .limit(1);

      if (!dailyItem) {
        console.log(`Item is not in daily menu for today (${todayStr}). Adding it temporarily...`);
        const [insertedDaily] = await db
          .insert(dailyMenuItems)
          .values({
            menuItemId: testItem.id,
            date: todayStr,
            isAvailable: true,
          })
          .returning();
        tempDailyMenuId = insertedDaily.id;
      }
    } else {
      console.log("No suitable existing item found. Creating a temporary category, menu item, and daily menu item...");
      
      // Create temporary category
      const [newCategory] = await db
        .insert(categories)
        .values({
          name: "Temp Stress Category",
          allowAlone: true,
          isSimple: false,
          isAvailable: true,
        })
        .returning();
      tempCategoryId = newCategory.id;

      // Create temporary menu item
      const [newItem] = await db
        .insert(menuItems)
        .values({
          name: "Temp Stress Plate",
          priceUsdCents: 1000, // $10.00
          categoryId: tempCategoryId,
          isAvailable: true,
          isPrepackaged: false,
        })
        .returning();
      tempMenuItemId = newItem.id;

      // Create temporary daily menu item
      const [newDaily] = await db
        .insert(dailyMenuItems)
        .values({
          menuItemId: tempMenuItemId,
          date: todayStr,
          isAvailable: true,
        })
        .returning();
      tempDailyMenuId = newDaily.id;

      testItem = {
        id: newItem.id,
        name: newItem.name,
        priceUsdCents: newItem.priceUsdCents,
        isPrepackaged: newItem.isPrepackaged,
        categoryId: tempCategoryId,
        categoryAllowAlone: true,
        categoryIsSimple: false,
        categoryName: "Temp Stress Category",
      };
    }

    console.log("Setup complete. Starting stress execution...");

    let activeIndex = 0;
    let successful = 0;
    let failed = 0;
    const latencies: number[] = [];
    const errors: Record<string, number> = {};

    const startTime = performance.now();

    async function worker() {
      while (true) {
        const index = activeIndex++;
        if (index >= total) break;

        const token = crypto.randomUUID();
        // Generate a valid Venezuelan phone number format
        const phone = `0412${String(index).padStart(7, "0")}`;

        const input = {
          phone,
          name: `Stress Test User ${index}`,
          paymentMethod,
          orderMode: "on_site",
          checkoutToken: token,
          items: [{ id: testItem.id, quantity: 1 }],
        };

        const reqStart = performance.now();
        try {
          await processCheckout({
            items: [{
              id: testItem.id,
              quantity: 1,
              removedComponents: [],
              fixedContornos: [],
              selectedAdicionales: [],
              selectedBebidas: [],
              categoryAllowAlone: testItem.categoryAllowAlone,
              categoryIsSimple: testItem.categoryIsSimple,
              categoryName: testItem.categoryName,
            }],
            input: input as any,
          });
          const reqEnd = performance.now();
          latencies.push(reqEnd - reqStart);
          successful++;
        } catch (error: any) {
          const reqEnd = performance.now();
          latencies.push(reqEnd - reqStart);
          failed++;
          const errMsg = error.message || "Unknown error";
          errors[errMsg] = (errors[errMsg] || 0) + 1;
        }
      }
    }

    // Start workers
    const workers = Array.from({ length: concurrency }).map(() => worker());
    await Promise.all(workers);

    const totalTimeMs = performance.now() - startTime;
    const totalTimeSec = totalTimeMs / 1000;
    const throughput = total / totalTimeSec;

    // Calculate percentiles
    latencies.sort((a, b) => a - b);
    const avgLatency = latencies.reduce((sum, val) => sum + val, 0) / latencies.length;
    const minLatency = latencies[0] || 0;
    const maxLatency = latencies[latencies.length - 1] || 0;
    const p50 = latencies[Math.floor(latencies.length * 0.50)] || 0;
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
    const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;

    console.log(`\n--- Stress Test Results ---`);
    console.log(`Total Duration: ${totalTimeSec.toFixed(2)}s`);
    console.log(`Throughput: ${throughput.toFixed(2)} requests/sec`);
    console.log(`Success Rate: ${((successful / total) * 100).toFixed(1)}% (${successful}/${total})`);
    console.log(`Failure Rate: ${((failed / total) * 100).toFixed(1)}% (${failed}/${total})`);
    
    console.log(`\n--- Latency Stats ---`);
    console.log(`  Min:  ${minLatency.toFixed(1)}ms`);
    console.log(`  Max:  ${maxLatency.toFixed(1)}ms`);
    console.log(`  Mean: ${avgLatency.toFixed(1)}ms`);
    console.log(`  p50:  ${p50.toFixed(1)}ms`);
    console.log(`  p95:  ${p95.toFixed(1)}ms`);
    console.log(`  p99:  ${p99.toFixed(1)}ms`);

    if (failed > 0) {
      console.log(`\n--- Error Breakdown ---`);
      for (const [msg, count] of Object.entries(errors)) {
        console.log(`  - ${msg}: ${count} occurrences`);
      }
    }

  } finally {
    console.log(`\n--- Cleaning Up Database ---`);

    try {
      // Clean up created orders
      const deletedOrders = await db
        .delete(orders)
        .where(like(orders.customerName, "Stress Test User %"));
      console.log(`- Deleted test orders`);

      // Clean up created customers
      const deletedCustomers = await db
        .delete(customers)
        .where(like(customers.name, "Stress Test User %"));
      console.log(`- Deleted test customers`);

      // Clean up temporary daily menu item
      if (tempDailyMenuId) {
        await db.delete(dailyMenuItems).where(eq(dailyMenuItems.id, tempDailyMenuId));
        console.log(`- Deleted temporary daily menu item`);
      }

      // Clean up temporary menu item
      if (tempMenuItemId) {
        await db.delete(menuItems).where(eq(menuItems.id, tempMenuItemId));
        console.log(`- Deleted temporary menu item`);
      }

      // Clean up temporary category
      if (tempCategoryId) {
        await db.delete(categories).where(eq(categories.id, tempCategoryId));
        console.log(`- Deleted temporary category`);
      }
    } catch (cleanupError: any) {
      console.error("Error during database cleanup:", cleanupError.message);
    }

    console.log("Cleanup finished.");
    process.exit(0);
  }
}

main().catch((e) => {
  console.error("Fatal Error:", e);
  process.exit(1);
});
