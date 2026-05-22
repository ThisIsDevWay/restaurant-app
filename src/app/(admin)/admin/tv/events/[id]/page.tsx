import { notFound } from "next/navigation";
import { db } from "@/db";
import {
  tvEvents,
  tvEventMedia,
  tvEventAssignments,
  tvMedia,
  tvDisplays,
} from "@/db/schema";
import { eq, asc, desc, and } from "drizzle-orm";
import { EventDetailClient } from "../_components/EventDetailClient";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [event] = await db
    .select()
    .from(tvEvents)
    .where(eq(tvEvents.id, id))
    .limit(1);
  if (!event) notFound();

  const eventMedia = await db
    .select({
      id: tvMedia.id,
      title: tvMedia.title,
      type: tvMedia.type,
      publicUrl: tvMedia.publicUrl,
      thumbnailUrl: tvMedia.thumbnailUrl,
      durationSeconds: tvMedia.durationSeconds,
      width: tvMedia.width,
      height: tvMedia.height,
      muted: tvMedia.muted,
      isActive: tvMedia.isActive,
      daypartStartMinutes: tvMedia.daypartStartMinutes,
      daypartEndMinutes: tvMedia.daypartEndMinutes,
      daypartDaysMask: tvMedia.daypartDaysMask,
      slideConfig: tvMedia.slideConfig,
      displayOrder: tvEventMedia.displayOrder,
    })
    .from(tvEventMedia)
    .innerJoin(tvMedia, eq(tvMedia.id, tvEventMedia.mediaId))
    .where(eq(tvEventMedia.eventId, id))
    .orderBy(asc(tvEventMedia.displayOrder));

  const allMedia = await db
    .select()
    .from(tvMedia)
    .where(and(eq(tvMedia.isGlobal, true), eq(tvMedia.isActive, true)))
    .orderBy(asc(tvMedia.displayOrder), desc(tvMedia.createdAt));

  const allDisplays = await db
    .select()
    .from(tvDisplays)
    .where(eq(tvDisplays.isActive, true))
    .orderBy(asc(tvDisplays.name));

  const assignmentRows = await db
    .select({ displayId: tvEventAssignments.displayId })
    .from(tvEventAssignments)
    .where(eq(tvEventAssignments.eventId, id));

  return (
    <EventDetailClient
      event={event}
      eventMedia={eventMedia.map((m) => ({
        ...m,
        displayOrder: m.displayOrder,
      }))}
      allMedia={allMedia}
      allDisplays={allDisplays}
      assignedDisplayIds={assignmentRows.map((a) => a.displayId)}
    />
  );
}
