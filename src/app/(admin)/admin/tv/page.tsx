import { db } from "@/db";
import { tvDisplays, tvMedia, tvEvents, tvEventMedia, categories } from "@/db/schema";
import { count, eq, desc, asc } from "drizzle-orm";
import { TvDashboardClient } from "./_components/TvDashboardClient";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

async function getTvData() {
  const [displaysList, globalMedia, eventMediaRows, categoryList, activeEventsCount] =
    await Promise.all([
      db
        .select()
        .from(tvDisplays)
        .orderBy(asc(tvDisplays.displayOrder), desc(tvDisplays.createdAt)),

      db
        .select()
        .from(tvMedia)
        .where(eq(tvMedia.isGlobal, true))
        .orderBy(asc(tvMedia.displayOrder), desc(tvMedia.createdAt)),

      db
        .select({
          id: tvMedia.id,
          title: tvMedia.title,
          type: tvMedia.type,
          storageBucket: tvMedia.storageBucket,
          storagePath: tvMedia.storagePath,
          imagekitFileId: tvMedia.imagekitFileId,
          thumbnailFileId: tvMedia.thumbnailFileId,
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
          eventId: tvEvents.id,
          eventName: tvEvents.name,
        })
        .from(tvMedia)
        .innerJoin(tvEventMedia, eq(tvEventMedia.mediaId, tvMedia.id))
        .innerJoin(tvEvents, eq(tvEvents.id, tvEventMedia.eventId))
        .where(eq(tvMedia.isGlobal, false))
        .orderBy(desc(tvMedia.createdAt)),

      db
        .select({
          id: categories.id,
          name: categories.name,
          sortOrder: categories.sortOrder,
          isAvailable: categories.isAvailable,
        })
        .from(categories)
        .orderBy(asc(categories.sortOrder), asc(categories.name)),

      db
        .select({ count: count() })
        .from(tvEvents)
        .where(eq(tvEvents.isActive, true))
        .then((rows) => rows[0]?.count ?? 0),
    ]);

  return {
    displaysList,
    globalMedia,
    eventMediaRows,
    categoryList,
    activeEventsCount,
  };
}

export default async function TvDashboardPage() {
  const data = await getTvData();

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-amber-500" />
        </div>
      }
    >
      <TvDashboardClient
        initialDisplays={data.displaysList}
        initialMedia={data.globalMedia}
        initialEventMedia={data.eventMediaRows as Parameters<typeof TvDashboardClient>[0]["initialEventMedia"]}
        categories={data.categoryList}
        initialStats={{
          activeEventsCount: data.activeEventsCount,
        }}
      />
    </Suspense>
  );
}
