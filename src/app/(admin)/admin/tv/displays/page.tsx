import { db } from "@/db";
import { tvDisplays } from "@/db/schema";
import { desc } from "drizzle-orm";
import { DisplaysClient } from "./_components/DisplaysClient";

export const dynamic = "force-dynamic";

export default async function DisplaysPage() {
  const rows = await db
    .select()
    .from(tvDisplays)
    .orderBy(desc(tvDisplays.createdAt));

  return <DisplaysClient initialDisplays={rows} />;
}
