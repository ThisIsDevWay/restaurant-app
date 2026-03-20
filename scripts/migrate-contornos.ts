/**
 * Migration script: Convert existing contorno option_groups to dish_components.
 *
 * Reads all option_groups with type === 'radio' (which were used as contornos)
 * and creates corresponding dish_components entries with type = 'contorno',
 * removable = false by default. The admin can adjust permissions later.
 *
 * Run with: npx tsx scripts/migrate-contornos.ts
 */

import { db } from "../src/db/index";
import { optionGroups, options, dishComponents } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function migrateContornos() {
  console.log("Starting contorno migration...");

  // Find all radio-type option groups (these are the contornos)
  const allGroups = await db.select().from(optionGroups);
  const radioGroups = allGroups.filter((g) => g.type === "radio");

  console.log(`Found ${radioGroups.length} radio groups to migrate`);

  let migrated = 0;

  for (const group of radioGroups) {
    // Get options for this group
    const groupOptions = await db
      .select()
      .from(options)
      .where(eq(options.groupId, group.id))
      .orderBy(options.sortOrder);

    // Create a dish_component for each option in the radio group
    for (let i = 0; i < groupOptions.length; i++) {
      const opt = groupOptions[i];

      await db.insert(dishComponents).values({
        menuItemId: group.menuItemId,
        name: opt.name,
        type: "contorno",
        removable: false,
        priceIfRemovedCents: null,
        allowPaidSubstitution: false,
        sortOrder: i,
      });

      migrated++;
    }
  }

  console.log(`Migration complete. Created ${migrated} dish_components entries.`);
}

migrateContornos()
  .then(() => {
    console.log("Done.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
