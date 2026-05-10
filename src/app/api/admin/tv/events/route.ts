import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/db";
import {
  tvEvents,
  tvEventMedia,
  tvEventAssignments,
} from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireAdmin();
  const events = await db
    .select({
      id: tvEvents.id,
      name: tvEvents.name,
      description: tvEvents.description,
      startsAt: tvEvents.startsAt,
      endsAt: tvEvents.endsAt,
      isActive: tvEvents.isActive,
      appliesToAllDisplays: tvEvents.appliesToAllDisplays,
      createdAt: tvEvents.createdAt,
      mediaCount: sql<number>`(SELECT COUNT(*) FROM ${tvEventMedia} WHERE ${tvEventMedia.eventId} = ${tvEvents.id})`,
      assignmentCount: sql<number>`(SELECT COUNT(*) FROM ${tvEventAssignments} WHERE ${tvEventAssignments.eventId} = ${tvEvents.id})`,
    })
    .from(tvEvents)
    .orderBy(desc(tvEvents.createdAt));
  return NextResponse.json({ events });
}
