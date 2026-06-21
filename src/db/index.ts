import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index";

const globalForDb = globalThis as unknown as {
    postgresClient: postgres.Sql | undefined;
};

const client = globalForDb.postgresClient ?? postgres(process.env.DATABASE_URL!, {
    prepare: false,
    max: 20,
    // Keep idle connections alive longer so warm serverless instances reuse
    // them instead of reconnecting — each reconnect re-runs postgres.js' type
    // introspection query (~390 rows), which was the single largest egress source.
    idle_timeout: 120,
    connect_timeout: 30,
});

// Reuse the client across module evaluations / warm invocations in ALL
// environments. Previously this only cached outside production, so every
// serverless cold start created a fresh client and paid the type-introspection
// cost again — the dominant Shared Pooler egress contributor.
globalForDb.postgresClient = client;

export const db = drizzle({ client, schema });
