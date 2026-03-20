import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

async function check() {
  const tables = await sql`
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    ORDER BY tablename
  `;
  console.log("Tables in database:");
  for (const t of tables) {
    console.log(" -", t.tablename);
  }

  // Check if users table exists and has data
  const users = await sql`SELECT email, role FROM users`;
  console.log("\nUsers:", users.length);
  for (const u of users) {
    console.log(" -", u.email, `(${u.role})`);
  }

  await sql.end();
}

check().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
