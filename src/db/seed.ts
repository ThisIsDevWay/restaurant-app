import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import bcrypt from "bcryptjs";
import { db } from "./index";
import { users, settings, exchangeRates, categories } from "./schema";

async function seed() {
  console.log("Seeding database...");

  // 1. Create admin user
  const passwordHash = await bcrypt.hash("admin123", 12);
  await db
    .insert(users)
    .values({
      email: "admin@gm.com",
      passwordHash,
      role: "admin",
    })
    .onConflictDoNothing();

  // 2. Create kitchen user
  const kitchenHash = await bcrypt.hash("cocina123", 12);
  await db
    .insert(users)
    .values({
      email: "cocina@gm.com",
      passwordHash: kitchenHash,
      role: "kitchen",
    })
    .onConflictDoNothing();

  // 3. Create exchange rate (placeholder)
  const [rate] = await db
    .insert(exchangeRates)
    .values({
      rateBsPerUsd: "451.50720000",
      validDate: new Date().toISOString().split("T")[0],
      source: "seed",
    })
    .returning();

  // 4. Create settings singleton
  await db
    .insert(settings)
    .values({
      bankName: "Banesco",
      bankCode: "0134",
      accountPhone: "04141234567",
      accountRif: "J-12345678-9",
      orderExpirationMinutes: 30,
      maxPendingOrders: 99,
      currentRateId: rate.id,
    })
    .onConflictDoNothing();

  // 5. Create categories
  const cats = await db
    .insert(categories)
    .values([
      { name: "Pollos", sortOrder: 1 },
      { name: "Carnes", sortOrder: 2 },
      { name: "Pastas", sortOrder: 3 },
      { name: "Bebidas", sortOrder: 4 },
      { name: "Adicionales", sortOrder: 5 },
    ])
    .onConflictDoNothing()
    .returning();

  console.log("Seed complete!", { users: 2, rate: 1, settings: 1, categories: cats.length });
}

seed().catch(console.error);
