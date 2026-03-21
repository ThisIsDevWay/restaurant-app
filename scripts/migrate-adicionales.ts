/**
 * Migrate existing checkbox option_groups into the global adicionales pool.
 *
 * Steps:
 * 1. Read all option_groups with type = 'checkbox'
 * 2. Deduplicate options by (name, priceUsdCents) -> insert into adicionales
 * 3. Rebuild menu_item_adicionales assignments
 * 4. Mark migrated option_groups with migrated_at timestamp
 *
 * Usage: npx tsx scripts/migrate-adicionales.ts
 */

import { config } from "dotenv";
import { eq, isNull, and } from "drizzle-orm";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/db/schema";
import { optionGroups, options, adicionales, menuItemAdicionales } from "../src/db/schema";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const client = postgres(process.env.DATABASE_URL!, { prepare: false });
  const db = drizzle({ client, schema });

  console.log("🔍 Fetching checkbox option groups...");
  const checkboxGroups = await db
    .select()
    .from(optionGroups)
    .where(eq(optionGroups.type, "checkbox"));

  if (checkboxGroups.length === 0) {
    console.log("✅ No checkbox option groups found. Nothing to migrate.");
    client.end();
    return;
  }

  console.log(`   Found ${checkboxGroups.length} checkbox groups.`);

  // Fetch all options for these groups
  const groupIds = checkboxGroups.map((g) => g.id);
  const allOptions = await db
    .select()
    .from(options);

  const checkboxOptions = allOptions.filter((o) => groupIds.includes(o.groupId));
  console.log(`   Found ${checkboxOptions.length} checkbox options.`);

  // Deduplicate by name + priceUsdCents
  const deduped = new Map<string, { name: string; priceUsdCents: number }>();
  for (const opt of checkboxOptions) {
    const key = `${opt.name.toLowerCase().trim()}__${opt.priceUsdCents}`;
    if (!deduped.has(key)) {
      deduped.set(key, { name: opt.name, priceUsdCents: opt.priceUsdCents });
    }
  }

  console.log(`   Deduplicated to ${deduped.size} unique adicionales.`);

  // Check for existing adicionales to avoid duplicates on re-run
  const existingAdicionales = await db.select().from(adicionales);
  const existingKeys = new Set(
    existingAdicionales.map(
      (a) => `${a.name.toLowerCase().trim()}__${a.priceUsdCents}`,
    ),
  );

  // Insert new adicionales
  let sortOrder = existingAdicionales.length;
  const keyToId = new Map<string, string>();

  for (const [key, data] of deduped) {
    const existing = existingAdicionales.find(
      (a) =>
        a.name.toLowerCase().trim() === data.name.toLowerCase().trim() &&
        a.priceUsdCents === data.priceUsdCents,
    );

    if (existing) {
      keyToId.set(key, existing.id);
      continue;
    }

    const [inserted] = await db
      .insert(adicionales)
      .values({ name: data.name, priceUsdCents: data.priceUsdCents, sortOrder })
      .returning();
    keyToId.set(key, inserted.id);
    sortOrder++;
    console.log(`   ➕ Created adicional: ${data.name} ($${(data.priceUsdCents / 100).toFixed(2)})`);
  }

  // Build assignments: for each checkbox group, find the menu_item_id,
  // then assign each option's corresponding adicional
  console.log("🔗 Building menu_item_adicionales assignments...");
  let assignmentCount = 0;

  for (const group of checkboxGroups) {
    const groupOptions = checkboxOptions.filter((o) => o.groupId === group.id);
    for (const opt of groupOptions) {
      const key = `${opt.name.toLowerCase().trim()}__${opt.priceUsdCents}`;
      const adicionalId = keyToId.get(key);
      if (!adicionalId) continue;

      // Check if assignment already exists
      const existing = await db
        .select()
        .from(menuItemAdicionales)
        .where(
          and(
            eq(menuItemAdicionales.menuItemId, group.menuItemId),
            eq(menuItemAdicionales.adicionalId, adicionalId),
          ),
        );

      if (existing.length === 0) {
        await db.insert(menuItemAdicionales).values({
          menuItemId: group.menuItemId,
          adicionalId,
        });
        assignmentCount++;
      }
    }
  }

  console.log(`   Created ${assignmentCount} new assignments.`);

  // Mark checkbox groups as migrated
  console.log("🏷️  Marking checkbox groups as migrated...");
  await db
    .update(optionGroups)
    .set({ migratedAt: new Date() })
    .where(
      and(
        eq(optionGroups.type, "checkbox"),
        isNull(optionGroups.migratedAt),
      ),
    );

  console.log("✅ Migration complete!");
  console.log(`   - ${deduped.size} adicionales in pool`);
  console.log(`   - ${assignmentCount} menu-item assignments`);
  console.log(`   - ${checkboxGroups.length} option_groups marked as migrated`);

  client.end();
}

main().catch((e) => {
  console.error("❌ Migration failed:", e);
  process.exit(1);
});
