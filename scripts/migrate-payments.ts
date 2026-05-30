import dotenv from "dotenv";
import postgres from "postgres";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL!;
if (!databaseUrl) {
  console.error("DATABASE_URL is not defined in .env.local");
  process.exit(1);
}

async function run() {
  console.log("Connecting to database...");
  const sql = postgres(databaseUrl, { max: 1 });

  try {
    console.log("Adding payment_efectivo_enabled...");
    await sql`ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "payment_efectivo_enabled" boolean DEFAULT false NOT NULL;`;

    console.log("Adding payment_zelle_enabled...");
    await sql`ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "payment_zelle_enabled" boolean DEFAULT false NOT NULL;`;

    console.log("Adding zelle_email...");
    await sql`ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "zelle_email" text;`;

    console.log("Adding zelle_name...");
    await sql`ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "zelle_name" text;`;

    console.log("Adding payment_binance_enabled...");
    await sql`ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "payment_binance_enabled" boolean DEFAULT false NOT NULL;`;

    console.log("Adding binance_email...");
    await sql`ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "binance_email" text;`;

    console.log("Adding binance_pay_id...");
    await sql`ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "binance_pay_id" text;`;

    console.log("Migration executed successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

run();
