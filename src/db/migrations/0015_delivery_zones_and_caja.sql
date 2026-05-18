ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "delivery_zones" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "require_payment_before_kitchen" boolean DEFAULT false NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paid_at" timestamp with time zone;
