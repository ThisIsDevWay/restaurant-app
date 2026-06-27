import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/db";
import { tvDisplays, tvDisplayMedia } from "@/db/schema";
import { asc, desc, eq, count } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireAdmin();
  const rows = await db
    .select({
      id: tvDisplays.id,
      name: tvDisplays.name,
      displayToken: tvDisplays.displayToken,
      orientation: tvDisplays.orientation,
      rotationDegrees: tvDisplays.rotationDegrees,
      lastSeenAt: tvDisplays.lastSeenAt,
      lastReportedOrientation: tvDisplays.lastReportedOrientation,
      lastReportedSize: tvDisplays.lastReportedSize,
      isActive: tvDisplays.isActive,
      audioEnabled: tvDisplays.audioEnabled,
      volumePercent: tvDisplays.volumePercent,
      linkedByUserId: tvDisplays.linkedByUserId,
      notes: tvDisplays.notes,
      displayOrder: tvDisplays.displayOrder,
      createdAt: tvDisplays.createdAt,
      updatedAt: tvDisplays.updatedAt,
      ownMediaCount: count(tvDisplayMedia.id),
    })
    .from(tvDisplays)
    .leftJoin(tvDisplayMedia, eq(tvDisplayMedia.displayId, tvDisplays.id))
    .groupBy(tvDisplays.id)
    .orderBy(asc(tvDisplays.displayOrder), desc(tvDisplays.createdAt));

  const now = Date.now();
  const decorated = rows.map((row) => ({
    ...row,
    online:
      row.isActive &&
      !!row.lastSeenAt &&
      now - new Date(row.lastSeenAt).getTime() < 30_000,
    hasOwnMedia: Number(row.ownMediaCount) > 0,
  }));
  return NextResponse.json({ displays: decorated });
}
