ALTER TABLE "daily_adicionales" ADD COLUMN "is_available" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_adicionales" ADD COLUMN "sold_out_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "daily_bebidas" ADD COLUMN "is_available" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_bebidas" ADD COLUMN "sold_out_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "daily_contornos" ADD COLUMN "is_available" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_contornos" ADD COLUMN "sold_out_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "daily_menu_items" ADD COLUMN "is_available" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_menu_items" ADD COLUMN "sold_out_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "included_note" text;--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "hide_adicionales" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "hide_bebidas" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "gps_coords" jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_metadata" jsonb;