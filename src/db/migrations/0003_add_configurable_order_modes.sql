ALTER TABLE "menu_items" ADD COLUMN "cost_usd_cents" integer;--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "cost_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "order_mode" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_address" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "instagram_url" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "order_mode_on_site_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "order_mode_take_away_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "order_mode_delivery_enabled" boolean DEFAULT true NOT NULL;