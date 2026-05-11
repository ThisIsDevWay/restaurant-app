import { db } from "@/db";
import { tvMedia, tvEventMedia, tvEvents, categories } from "@/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import { MediaClient } from "./_components/MediaClient";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  // Global library: shared across all TVs / default playlist.
  const globalMedia = await db
    .select()
    .from(tvMedia)
    .where(eq(tvMedia.isGlobal, true))
    .orderBy(asc(tvMedia.displayOrder), desc(tvMedia.createdAt));

  // Event-specific media: uploaded directly for a single event.
  const eventMediaRows = await db
    .select({
      // All tvMedia columns
      id: tvMedia.id,
      title: tvMedia.title,
      type: tvMedia.type,
      storageBucket: tvMedia.storageBucket,
      storagePath: tvMedia.storagePath,
      publicUrl: tvMedia.publicUrl,
      thumbnailUrl: tvMedia.thumbnailUrl,
      mimeType: tvMedia.mimeType,
      fileSizeBytes: tvMedia.fileSizeBytes,
      width: tvMedia.width,
      height: tvMedia.height,
      durationSeconds: tvMedia.durationSeconds,
      displayOrder: tvMedia.displayOrder,
      isActive: tvMedia.isActive,
      isGlobal: tvMedia.isGlobal,
      muted: tvMedia.muted,
      slideConfig: tvMedia.slideConfig,
      daypartStartMinutes: tvMedia.daypartStartMinutes,
      daypartEndMinutes: tvMedia.daypartEndMinutes,
      daypartDaysMask: tvMedia.daypartDaysMask,
      uploadedByUserId: tvMedia.uploadedByUserId,
      createdAt: tvMedia.createdAt,
      updatedAt: tvMedia.updatedAt,
      // Event info
      eventId: tvEvents.id,
      eventName: tvEvents.name,
    })
    .from(tvMedia)
    .innerJoin(tvEventMedia, eq(tvEventMedia.mediaId, tvMedia.id))
    .innerJoin(tvEvents, eq(tvEvents.id, tvEventMedia.eventId))
    .where(eq(tvMedia.isGlobal, false))
    .orderBy(desc(tvMedia.createdAt));

  // Categories for the "Create menu board" picker.
  const categoryRows = await db
    .select({
      id: categories.id,
      name: categories.name,
      sortOrder: categories.sortOrder,
      isAvailable: categories.isAvailable,
    })
    .from(categories)
    .where(eq(categories.isAvailable, true))
    .orderBy(asc(categories.sortOrder), asc(categories.name));

  return (
    <MediaClient
      initialMedia={globalMedia}
      initialEventMedia={eventMediaRows}
      categories={categoryRows}
    />
  );
}
