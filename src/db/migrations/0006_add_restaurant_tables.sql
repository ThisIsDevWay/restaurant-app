CREATE TABLE "restaurant_tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"section" text DEFAULT 'Principal',
	"capacity" integer DEFAULT 4 NOT NULL,
	"qr_token" text NOT NULL,
	"grid_col" integer DEFAULT 1 NOT NULL,
	"grid_row" integer DEFAULT 1 NOT NULL,
	"col_span" integer DEFAULT 2 NOT NULL,
	"row_span" integer DEFAULT 2 NOT NULL,
	"shape" text DEFAULT 'cuadrada' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "restaurant_tables_qr_token_unique" UNIQUE("qr_token")
);
