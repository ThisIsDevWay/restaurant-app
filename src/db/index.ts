import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index";

const globalForDb = globalThis as unknown as {
    postgresClient: postgres.Sql | undefined;
};

const client = globalForDb.postgresClient ?? postgres(process.env.DATABASE_URL!, {
    prepare: false,
    max: 20,
    idle_timeout: 30,
    connect_timeout: 10,
});

if (process.env.NODE_ENV !== "production") {
    globalForDb.postgresClient = client;
}

export const db = drizzle({ client, schema });
