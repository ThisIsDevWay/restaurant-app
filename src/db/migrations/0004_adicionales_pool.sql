-- 0004_adicionales_pool: Create global adicionales pool and junction table
-- Adds adicionales table, menu_item_adicionales junction table,
-- and migrated_at column on option_groups for rollback safety.

CREATE TABLE IF NOT EXISTS "adicionales" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "price_usd_cents" integer NOT NULL DEFAULT 0,
  "is_available" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "menu_item_adicionales" (
  "menu_item_id" uuid NOT NULL REFERENCES "menu_items"("id") ON DELETE CASCADE,
  "adicional_id" uuid NOT NULL REFERENCES "adicionales"("id") ON DELETE CASCADE,
  CONSTRAINT "menu_item_adicionales_pkey" PRIMARY KEY ("menu_item_id", "adicional_id")
);

ALTER TABLE "option_groups" ADD COLUMN IF NOT EXISTS "migrated_at" timestamp with time zone;
