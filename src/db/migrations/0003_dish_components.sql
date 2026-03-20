CREATE TABLE "dish_components" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "menu_item_id" uuid NOT NULL REFERENCES "menu_items"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "type" text NOT NULL CHECK ("type" IN ('contorno', 'fixed')),
  "removable" boolean NOT NULL DEFAULT false,
  "price_if_removed_cents" integer,
  "allow_paid_substitution" boolean NOT NULL DEFAULT false,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now()
);
