-- Drop old constraint and index
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_dynamic_cents_surcharge_check";
DROP INDEX IF EXISTS "orders_exact_amount_pending_idx";

-- Drop old columns from orders
ALTER TABLE "orders" DROP COLUMN IF EXISTS "dynamic_cents_surcharge";
ALTER TABLE "orders" DROP COLUMN IF EXISTS "exact_amount_bs_cents";

-- Add payment_provider column to orders
ALTER TABLE "orders" ADD COLUMN "payment_provider" text NOT NULL DEFAULT 'banesco_reference';

-- Add FK constraint on payment_log_id (deferred, will work after payments_log is recreated)
-- ALTER TABLE "orders" ADD CONSTRAINT "orders_payment_log_id_payments_log_id_fk"
--   FOREIGN KEY ("payment_log_id") REFERENCES "payments_log"("id");

-- Recreate payments_log with new schema
DROP TABLE IF EXISTS "payments_log";
CREATE TABLE "payments_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"provider_id" text NOT NULL,
	"amount_bs_cents" integer NOT NULL,
	"reference" text,
	"sender_phone" text,
	"provider_raw" jsonb NOT NULL,
	"outcome" text NOT NULL,
	"confirmed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_log_reference_unique" UNIQUE("reference")
);

-- Add FK from orders.payment_log_id to payments_log.id
ALTER TABLE "orders" ADD CONSTRAINT "orders_payment_log_id_payments_log_id_fk"
  FOREIGN KEY ("payment_log_id") REFERENCES "payments_log"("id") ON DELETE no action ON UPDATE no action;

-- Add new columns to settings
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "active_payment_provider" text NOT NULL DEFAULT 'banesco_reference';
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "banesco_api_key" text;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "mercantil_client_id" text;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "mercantil_client_secret" text;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "bnc_api_key" text;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "whatsapp_number" text NOT NULL DEFAULT '';
