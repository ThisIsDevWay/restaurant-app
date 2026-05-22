import { db } from "@/db";
import { tvDisplays, tvMedia, tvEvents } from "@/db/schema";
import { count, eq, desc } from "drizzle-orm";
import { TvDashboardClient } from "./_components/TvDashboardClient";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

async function getTvData() {
  const [displaysList] = await Promise.all([
    db
      .select()
      .from(tvDisplays)
      .orderBy(desc(tvDisplays.createdAt)),
  ]);

  const [mediaCount] = await db
    .select({ count: count() })
    .from(tvMedia)
    .where(eq(tvMedia.isActive, true));

  const [activeEventsCount] = await db
    .select({ count: count() })
    .from(tvEvents)
    .where(eq(tvEvents.isActive, true));

  return {
    displaysList,
    mediaCount: mediaCount?.count ?? 0,
    activeEventsCount: activeEventsCount?.count ?? 0,
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
        initialStats={{
          mediaCount: data.mediaCount,
          activeEventsCount: data.activeEventsCount,
        }}
      />
    </Suspense>
  );
}
