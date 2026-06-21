ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "default_active" boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "menu_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
