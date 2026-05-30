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
import type { TvMenuBoardConfig } from "@/db/schema/tv";
import { isItemActiveNow } from "./tv-dayparting";
import { resolveMenuBoard, type MenuBoardData } from "./tv-menu-board";

export type ResolvedItem = {
  id: string;
  type: "image" | "video" | "menu_board";
  /** Only set for image/video. */
  url?: string;
  durationSeconds: number;
  /** If true, this item is muted regardless of display.audioEnabled. */
  muted: boolean;
  /** Only set for menu_board items. */
  menuBoard?: MenuBoardData;
};

export type ResolvedPlaylist = {
  source: "default" | "event";
  eventId: string | null;
  eventName: string | null;
  items: ResolvedItem[];
  /** SHA-1 short hash of items - stable when content is unchanged. */
  version: string;
};

/** Row shape returned by every internal media query before final transform. */
type RawMediaRow = {
  id: string;
  type: "image" | "video" | "menu_board";
  url: string | null;
  durationSeconds: number;
  muted: boolean;
  slideConfig: TvMenuBoardConfig | null;
  daypartStartMinutes: number | null;
  daypartEndMinutes: number | null;
  daypartDaysMask: number | null;
};

/**
 * Resolves which playlist a given TV should show right now.
 *
 * Priority:
 *  1. Active event whose date range matches now AND
 *     (appliesToAllDisplays = true OR a tvEventAssignment exists for this display).
 *     If multiple events match, use the most recently created.
 *  2. Default playlist:
 *     a) If this display has explicit selections in tvDisplayMedia → use those.
 *     b) Otherwise → all global media.
 *
 * After source selection, items are filtered by their dayparting fields (only
 * those active at the current local time pass through). Menu board slides have
 * their data resolved on-the-fly so the TV always shows fresh prices/availability.
 *
 * Returns a deterministic `version` hash so the TV can skip re-rendering
 * when its content hasn't changed since the last poll. The hash includes the
 * current 15-minute time bucket so dayparting transitions trigger a refresh.
 */
export async function resolveContentForDisplay(
  displayId: string,
): Promise<ResolvedPlaylist> {
  const now = new Date();

  // Look up the display to get its orientation for portrait-aware pagination.
  const [displayRow] = await db
    .select({ orientation: tvDisplays.orientation })
    .from(tvDisplays)
    .where(eq(tvDisplays.id, displayId))
    .limit(1);
  const orientationHint: "portrait" | "landscape" | undefined =
    displayRow?.orientation === "portrait"
      ? "portrait"
      : displayRow?.orientation === "landscape"
        ? "landscape"
        : undefined;

  // ── Try to find a matching active event for this display ────────────
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
    const eventRows = await db
      .select({
        id: tvMedia.id,
        type: tvMedia.type,
        url: tvMedia.publicUrl,
        durationSeconds: tvMedia.durationSeconds,
        muted: tvMedia.muted,
        slideConfig: tvMedia.slideConfig,
        daypartStartMinutes: tvMedia.daypartStartMinutes,
        daypartEndMinutes: tvMedia.daypartEndMinutes,
        daypartDaysMask: tvMedia.daypartDaysMask,
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

    const items = await materializeItems(eventRows, now, orientationHint);

    return {
      source: "event",
      eventId: event.id,
      eventName: event.name,
      items,
      version: hashItems(items, now),
    };
  }

  // ── Default playlist resolution ──────────────────────────────────────
  const displaySpecificRows = await db
    .select({
      id: tvMedia.id,
      type: tvMedia.type,
      url: tvMedia.publicUrl,
      durationSeconds: tvMedia.durationSeconds,
      muted: tvMedia.muted,
      slideConfig: tvMedia.slideConfig,
      daypartStartMinutes: tvMedia.daypartStartMinutes,
      daypartEndMinutes: tvMedia.daypartEndMinutes,
      daypartDaysMask: tvMedia.daypartDaysMask,
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

  const defaultRows =
    displaySpecificRows.length > 0
      ? displaySpecificRows
      : await db
          .select({
            id: tvMedia.id,
            type: tvMedia.type,
            url: tvMedia.publicUrl,
            durationSeconds: tvMedia.durationSeconds,
            muted: tvMedia.muted,
            slideConfig: tvMedia.slideConfig,
            daypartStartMinutes: tvMedia.daypartStartMinutes,
            daypartEndMinutes: tvMedia.daypartEndMinutes,
            daypartDaysMask: tvMedia.daypartDaysMask,
          })
          .from(tvMedia)
          .where(and(eq(tvMedia.isActive, true), eq(tvMedia.isGlobal, true)))
          .orderBy(asc(tvMedia.displayOrder), asc(tvMedia.createdAt));

  const items = await materializeItems(defaultRows, now, orientationHint);

  return {
    source: "default",
    eventId: null,
    eventName: null,
    items,
    version: hashItems(items, now),
  };
}

/**
 * Applies dayparting filter and resolves menu-board data. Image/video items
 * pass through. Items whose URL is missing (incomplete uploads) are dropped.
 */
async function materializeItems(
  rows: RawMediaRow[],
  now: Date,
  orientationHint?: "portrait" | "landscape",
): Promise<ResolvedItem[]> {
  const out: ResolvedItem[] = [];
  for (const row of rows) {
    if (!isItemActiveNow(row, now)) continue;

    if (row.type === "menu_board") {
      if (!row.slideConfig) continue; // misconfigured slide
      let pages: MenuBoardData[];
      try {
        pages = await resolveMenuBoard(row.slideConfig, orientationHint);
      } catch (err) {
        console.error("Failed to resolve menu board", row.id, err);
        continue;
      }
      // Each page becomes its own carousel item so the display auto-advances
      // through the full menu without any client-side timer in the slide.
      for (const page of pages) {
        out.push({
          id: pages.length === 1 ? row.id : `${row.id}-p${page.pageIndex}`,
          type: "menu_board",
          durationSeconds: row.durationSeconds,
          muted: true,
          menuBoard: page,
        });
      }
    } else {
      if (!row.url) continue; // image/video without a URL: skip
      out.push({
        id: row.id,
        type: row.type,
        url: row.url,
        durationSeconds: row.durationSeconds,
        muted: row.muted,
      });
    }
  }
  return out;
}

/**
 * Stable hash that changes when items, their order, or their durations change.
 * 8-char SHA-1 prefix is plenty to detect real changes; collisions are harmless
 * (worst case: TV does an extra refresh).
 *
 * For menu_board items we hash item names/prices so menu DB edits invalidate
 * the cache. The naïve "set of items" view already changes when dayparting
 * filters add/remove items, so the bucket isn't needed for time transitions.
 */
function hashItems(items: ResolvedItem[], _now: Date): string {
  if (items.length === 0) return "empty";
  const payload = items
    .map((i) => {
      if (i.type === "menu_board") {
        const mb = i.menuBoard;
        const sig = mb
          ? mb.items
              .map((m) => `${m.id}:${m.priceUsdCents}`)
              .join(",")
          : "";
        return `mb:${i.id}:${i.durationSeconds}:${sig}`;
      }
      return `${i.id}:${i.durationSeconds}:${i.muted ? 1 : 0}`;
    })
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

const HEARTBEAT_THROTTLE_MS = 60_000; // 1 minute

/**
 * Updates lastSeenAt and reported screen info. Best-effort - does not throw.
 *
 * Pass `currentLastSeenAt` (already available from findActiveDisplayByToken) to
 * skip the UPDATE when a heartbeat was written less than 60 s ago — this avoids
 * ~47k unnecessary UPDATEs/day (one per TV poll) without an extra SELECT query.
 */
export async function updateDisplayHeartbeat(params: {
  displayId: string;
  currentLastSeenAt?: Date | null;
  reportedOrientation?: string | null;
  reportedSize?: string | null;
}): Promise<void> {
  const { displayId, currentLastSeenAt, reportedOrientation, reportedSize } =
    params;

  // Skip if a heartbeat was already written recently
  const lastSeenDate = currentLastSeenAt ? new Date(currentLastSeenAt) : null;
  if (
    lastSeenDate &&
    !isNaN(lastSeenDate.getTime()) &&
    Date.now() - lastSeenDate.getTime() < HEARTBEAT_THROTTLE_MS
  ) {
    return;
  }

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
