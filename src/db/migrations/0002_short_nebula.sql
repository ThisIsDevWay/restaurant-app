CREATE TABLE "customers" (
	"phone" text PRIMARY KEY NOT NULL,
	"name" text,
	"cedula" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_adicionales" (
	"date" date NOT NULL,
	"adicional_item_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_adicionales_date_adicional_item_id_pk" PRIMARY KEY("date","adicional_item_id")
);
--> statement-breakpoint
CREATE TABLE "daily_bebidas" (
	"date" date NOT NULL,
	"bebida_item_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_bebidas_date_bebida_item_id_pk" PRIMARY KEY("date","bebida_item_id")
);
--> statement-breakpoint
CREATE TABLE "daily_contornos" (
	"date" date NOT NULL,
	"contorno_item_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_contornos_date_contorno_item_id_pk" PRIMARY KEY("date","contorno_item_id")
);
--> statement-breakpoint
CREATE TABLE "daily_menu_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"menu_item_id" uuid NOT NULL,
	"date" date NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_menu_items_menu_item_id_date_unique" UNIQUE("menu_item_id","date")
);
--> statement-breakpoint
CREATE TABLE "menu_item_adicionales" (
	"menu_item_id" uuid NOT NULL,
	"adicional_item_id" uuid NOT NULL,
	CONSTRAINT "menu_item_adicionales_menu_item_id_adicional_item_id_pk" PRIMARY KEY("menu_item_id","adicional_item_id")
);
--> statement-breakpoint
CREATE TABLE "menu_item_bebidas" (
	"menu_item_id" uuid NOT NULL,
	"bebida_item_id" uuid NOT NULL,
	CONSTRAINT "menu_item_bebidas_menu_item_id_bebida_item_id_pk" PRIMARY KEY("menu_item_id","bebida_item_id")
);
--> statement-breakpoint
CREATE TABLE "menu_item_contornos" (
	"menu_item_id" uuid NOT NULL,
	"contorno_item_id" uuid NOT NULL,
	"removable" boolean DEFAULT false NOT NULL,
	"substitute_contorno_ids" uuid[] DEFAULT '{}' NOT NULL,
	CONSTRAINT "menu_item_contornos_menu_item_id_contorno_item_id_pk" PRIMARY KEY("menu_item_id","contorno_item_id")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"body" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_templates_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "menu_items" DROP CONSTRAINT "menu_items_price_usd_cents_check";--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_dynamic_cents_surcharge_check";--> statement-breakpoint
DROP INDEX "orders_exact_amount_pending_idx";--> statement-breakpoint
ALTER TABLE "payments_log" ALTER COLUMN "reference" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "allow_alone" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "is_simple" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "is_available" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD COLUMN "currency" text DEFAULT 'usd' NOT NULL;--> statement-breakpoint
ALTER TABLE "option_groups" ADD COLUMN "migrated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "order_number" serial NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_provider" text NOT NULL;--> statement-breakpoint
ALTER TABLE "payments_log" ADD COLUMN "order_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "payments_log" ADD COLUMN "provider_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "payments_log" ADD COLUMN "provider_raw" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "payments_log" ADD COLUMN "outcome" text NOT NULL;--> statement-breakpoint
ALTER TABLE "payments_log" ADD COLUMN "confirmed_by" uuid;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "rate_currency" text DEFAULT 'usd' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "show_rate_in_menu" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "active_payment_provider" text DEFAULT 'banesco_reference' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "banesco_api_key" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "mercantil_client_id" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "mercantil_client_secret" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "mercantil_secret_key" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "mercantil_merchant_id" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "mercantil_integrator_id" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "mercantil_terminal_id" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "bnc_api_key" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "whatsapp_number" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "whatsapp_microservice_url" text DEFAULT 'http://38.171.255.120:3333' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "adicionales_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "bebidas_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "max_quantity_per_item" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_adicionales" ADD CONSTRAINT "daily_adicionales_adicional_item_id_menu_items_id_fk" FOREIGN KEY ("adicional_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_bebidas" ADD CONSTRAINT "daily_bebidas_bebida_item_id_menu_items_id_fk" FOREIGN KEY ("bebida_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_contornos" ADD CONSTRAINT "daily_contornos_contorno_item_id_menu_items_id_fk" FOREIGN KEY ("contorno_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_menu_items" ADD CONSTRAINT "daily_menu_items_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_adicionales" ADD CONSTRAINT "menu_item_adicionales_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_adicionales" ADD CONSTRAINT "menu_item_adicionales_adicional_item_id_menu_items_id_fk" FOREIGN KEY ("adicional_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_bebidas" ADD CONSTRAINT "menu_item_bebidas_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_bebidas" ADD CONSTRAINT "menu_item_bebidas_bebida_item_id_menu_items_id_fk" FOREIGN KEY ("bebida_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_contornos" ADD CONSTRAINT "menu_item_contornos_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_contornos" ADD CONSTRAINT "menu_item_contornos_contorno_item_id_menu_items_id_fk" FOREIGN KEY ("contorno_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_payment_log_id_payments_log_id_fk" FOREIGN KEY ("payment_log_id") REFERENCES "public"."payments_log"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "dynamic_cents_surcharge";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "exact_amount_bs_cents";--> statement-breakpoint
ALTER TABLE "payments_log" DROP COLUMN "raw_payload";--> statement-breakpoint
ALTER TABLE "payments_log" DROP COLUMN "match_status";--> statement-breakpoint
ALTER TABLE "payments_log" DROP COLUMN "matched_order_id";--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_price_usd_cents_check" CHECK ("menu_items"."price_usd_cents" >= 0);