import crypto from "crypto";
import { db } from "@/db";
import {
  tvDisplays,
  tvEvents,
  tvEventMedia,
  tvEventAssignments,
  tvMedia,
  tvDisplayMedia,
} from "@/db/schema";
import { and, asc, desc, eq, isNull, lte, gte, or, sql } from "drizzle-orm";

export type ResolvedItem = {
  id: string;
  type: "image" | "video";
  url: string;
  durationSeconds: number;
  /** If true, this item is muted regardless of display.audioEnabled. */
  muted: boolean;
};

export type ResolvedPlaylist = {
  source: "default" | "event";
  eventId: string | null;
  eventName: string | null;
  items: ResolvedItem[];
  /** SHA-1 short hash of items - stable when content is unchanged. */
  version: string;
};

/**
 * Resolves which playlist a given TV should show right now.
 *
 * Priority:
 *  1. Active event whose date range matches now AND
 *     (appliesToAllDisplays = true OR a tvEventAssignment exists for this display).
 *     If multiple events match, use the most recently created.
 *  2. Default playlist: active media items ordered by displayOrder.
 *
 * Returns a deterministic `version` hash so the TV can skip re-rendering
 * when its content hasn't changed since the last poll.
 */
export async function resolveContentForDisplay(
  displayId: string,
): Promise<ResolvedPlaylist> {
  const now = new Date();

  // Find a matching active event for this display.
  const matchingEvents = await db
    .select({
      id: tvEvents.id,
      name: tvEvents.name,
      createdAt: tvEvents.createdAt,
      appliesToAllDisplays: tvEvents.appliesToAllDisplays,
    })
    .from(tvEvents)
    .leftJoin(
      tvEventAssignments,
      and(
        eq(tvEventAssignments.eventId, tvEvents.id),
        eq(tvEventAssignments.displayId, displayId),
      ),
    )
    .where(
      and(
        eq(tvEvents.isActive, true),
        or(isNull(tvEvents.startsAt), lte(tvEvents.startsAt, now)),
        or(isNull(tvEvents.endsAt), gte(tvEvents.endsAt, now)),
        or(
          eq(tvEvents.appliesToAllDisplays, true),
          sql`${tvEventAssignments.id} IS NOT NULL`,
        ),
      ),
    )
    .orderBy(desc(tvEvents.createdAt))
    .limit(1);

  if (matchingEvents.length > 0) {
    const event = matchingEvents[0];
    const eventItems = await db
      .select({
        id: tvMedia.id,
        type: tvMedia.type,
        url: tvMedia.publicUrl,
        durationSeconds: tvMedia.durationSeconds,
        muted: tvMedia.muted,
        displayOrder: tvEventMedia.displayOrder,
      })
      .from(tvEventMedia)
      .innerJoin(tvMedia, eq(tvMedia.id, tvEventMedia.mediaId))
      .where(
        and(
          eq(tvEventMedia.eventId, event.id),
          eq(tvMedia.isActive, true),
        ),
      )
      .orderBy(asc(tvEventMedia.displayOrder), asc(tvMedia.createdAt));

    const items: ResolvedItem[] = eventItems.map((row) => ({
      id: row.id,
      type: row.type,
      url: row.url,
      durationSeconds: row.durationSeconds,
      muted: row.muted,
    }));

    return {
      source: "event",
      eventId: event.id,
      eventName: event.name,
      items,
      version: hashItems(items),
    };
  }

  // Default playlist resolution:
  //   1. If this display has explicit selections in tvDisplayMedia → use those.
  //   2. Otherwise → fallback to ALL global media (back-compat).
  const displaySpecificItems = await db
    .select({
      id: tvMedia.id,
      type: tvMedia.type,
      url: tvMedia.publicUrl,
      durationSeconds: tvMedia.durationSeconds,
      muted: tvMedia.muted,
      perDisplayOrder: tvDisplayMedia.displayOrder,
    })
    .from(tvDisplayMedia)
    .innerJoin(tvMedia, eq(tvMedia.id, tvDisplayMedia.mediaId))
    .where(
      and(
        eq(tvDisplayMedia.displayId, displayId),
        eq(tvMedia.isActive, true),
        eq(tvMedia.isGlobal, true),
      ),
    )
    .orderBy(asc(tvDisplayMedia.displayOrder), asc(tvMedia.createdAt));

  const defaultItems =
    displaySpecificItems.length > 0
      ? displaySpecificItems
      : await db
          .select({
            id: tvMedia.id,
            type: tvMedia.type,
            url: tvMedia.publicUrl,
            durationSeconds: tvMedia.durationSeconds,
            muted: tvMedia.muted,
          })
          .from(tvMedia)
          .where(and(eq(tvMedia.isActive, true), eq(tvMedia.isGlobal, true)))
          .orderBy(asc(tvMedia.displayOrder), asc(tvMedia.createdAt));

  const items: ResolvedItem[] = defaultItems.map((row) => ({
    id: row.id,
    type: row.type,
    url: row.url,
    durationSeconds: row.durationSeconds,
    muted: row.muted,
  }));

  return {
    source: "default",
    eventId: null,
    eventName: null,
    items,
    version: hashItems(items),
  };
}

/**
 * Stable hash that changes when items, their order, or their durations change.
 * 8-char SHA-1 prefix is plenty to detect real changes; collisions are harmless
 * (worst case: TV does an extra refresh).
 */
function hashItems(items: ResolvedItem[]): string {
  if (items.length === 0) return "empty";
  // Include muted flag so toggling audio on a clip refreshes the TV.
  const payload = items
    .map((i) => `${i.id}:${i.durationSeconds}:${i.muted ? 1 : 0}`)
    .join("|");
  return crypto
    .createHash("sha1")
    .update(payload)
    .digest("hex")
    .slice(0, 8);
}

/**
 * Look up a TV by its display token. Returns null when missing or revoked.
 */
export async function findActiveDisplayByToken(token: string) {
  const [display] = await db
    .select()
    .from(tvDisplays)
    .where(eq(tvDisplays.displayToken, token))
    .limit(1);
  if (!display) return null;
  if (!display.isActive) return null;
  return display;
}

/**
 * Updates lastSeenAt and reported screen info. Best-effort - does not throw.
 */
export async function updateDisplayHeartbeat(params: {
  displayId: string;
  reportedOrientation?: string | null;
  reportedSize?: string | null;
}): Promise<void> {
  const { displayId, reportedOrientation, reportedSize } = params;
  try {
    await db
      .update(tvDisplays)
      .set({
        lastSeenAt: new Date(),
        ...(reportedOrientation
          ? { lastReportedOrientation: reportedOrientation }
          : {}),
        ...(reportedSize ? { lastReportedSize: reportedSize } : {}),
      })
      .where(eq(tvDisplays.id, displayId));
  } catch (err) {
    console.error("Failed to update tv heartbeat", err);
  }
}
