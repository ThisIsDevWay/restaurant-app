CREATE TABLE IF NOT EXISTS "bank_notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "source" text NOT NULL,
  "sender" text NOT NULL,
  "message" text NOT NULL,
  "amount_raw" text,
  "amount_bs_cents" integer NOT NULL,
  "reference" text NOT NULL,
  "sender_phone" text,
  "sender_document" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "order_id" uuid REFERENCES "orders"("id") ON DELETE SET NULL,
  "raw_payload" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "bank_notifications_reference_unique" UNIQUE("reference")
);

CREATE INDEX IF NOT EXISTS "bank_notifications_reference_idx" ON "bank_notifications" ("reference");
CREATE INDEX IF NOT EXISTS "bank_notifications_status_idx" ON "bank_notifications" ("status");
CREATE INDEX IF NOT EXISTS "bank_notifications_amount_status_idx" ON "bank_notifications" ("amount_bs_cents", "status");

ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "local_device_token" text;
