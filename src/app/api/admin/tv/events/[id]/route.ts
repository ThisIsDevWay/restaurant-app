import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/db";
import {
  tvEvents,
  tvEventMedia,
  tvEventAssignments,
  tvMedia,
  tvDisplays,
} from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id } = await ctx.params;

  const [event] = await db
    .select()
    .from(tvEvents)
    .where(eq(tvEvents.id, id))
    .limit(1);
  if (!event) {
    return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
  }

  const media = await db
    .select({
      id: tvMedia.id,
      title: tvMedia.title,
      type: tvMedia.type,
      publicUrl: tvMedia.publicUrl,
      thumbnailUrl: tvMedia.thumbnailUrl,
      durationSeconds: tvMedia.durationSeconds,
      displayOrder: tvEventMedia.displayOrder,
      eventMediaId: tvEventMedia.id,
    })
    .from(tvEventMedia)
    .innerJoin(tvMedia, eq(tvMedia.id, tvEventMedia.mediaId))
    .where(eq(tvEventMedia.eventId, id))
    .orderBy(asc(tvEventMedia.displayOrder));

  const assignments = await db
    .select({
      id: tvEventAssignments.id,
      displayId: tvDisplays.id,
      displayName: tvDisplays.name,
    })
    .from(tvEventAssignments)
    .innerJoin(tvDisplays, eq(tvDisplays.id, tvEventAssignments.displayId))
    .where(eq(tvEventAssignments.eventId, id));

  return NextResponse.json({ event, media, assignments });
}
