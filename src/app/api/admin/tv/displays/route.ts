import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/db";
import { tvDisplays } from "@/db/schema";
import { asc, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireAdmin();
  const rows = await db
    .select()
    .from(tvDisplays)
    .orderBy(asc(tvDisplays.displayOrder), desc(tvDisplays.createdAt));
  const now = Date.now();
  const decorated = rows.map((row) => ({
    ...row,
    online:
      row.isActive &&
      !!row.lastSeenAt &&
      now - new Date(row.lastSeenAt).getTime() < 30_000,
  }));
  return NextResponse.json({ displays: decorated });
}
