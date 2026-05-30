import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
  index,
  check,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

/**
 * Smart TVs registered for the restaurant. Each row represents a paired display.
 * Identified by `displayToken` ("tv_" + 32 hex chars), stored in the TV browser localStorage.
 */
export const tvDisplays = pgTable(
  "tv_displays",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull().default("TV sin nombre"),
    displayToken: text("display_token").notNull().unique(),
    /** 'auto' | 'landscape' | 'portrait' */
    orientation: text("orientation")
      .notNull()
      .default("auto")
      .$type<"auto" | "landscape" | "portrait">(),
    /** Additional CSS rotation: 0 | 90 | 180 | 270 */
    rotationDegrees: integer("rotation_degrees").notNull().default(0),
    /** Updated on every poll from the TV. */
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    /** Reported by the TV's screen.orientation API in each poll. */
    lastReportedOrientation: text("last_reported_orientation"),
    /** "1920x1080" reported on each poll. */
    lastReportedSize: text("last_reported_size"),
    isActive: boolean("is_active").notNull().default(true),
    /** Master audio switch per display. */
    audioEnabled: boolean("audio_enabled").notNull().default(false),
    /** 0..100 - applied to <video>.volume on the TV. */
    volumePercent: integer("volume_percent").notNull().default(80),
    linkedByUserId: uuid("linked_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "tv_displays_orientation_check",
      sql`${table.orientation} IN ('auto', 'landscape', 'portrait')`,
    ),
    check(
      "tv_displays_rotation_check",
      sql`${table.rotationDegrees} IN (0, 90, 180, 270)`,
    ),
    check(
      "tv_displays_volume_check",
      sql`${table.volumePercent} >= 0 AND ${table.volumePercent} <= 100`,
    ),
  ],
);

/**
 * Temporary pairing sessions. The TV browser polls /api/tv/pair/check until
 * an admin validates the code. Sessions expire after 5 minutes.
 *
 * Only ONE pending session can hold a given pairing code at a time. Expired
 * or linked sessions can share old codes (partial unique index below).
 */
export const tvPairingSessions = pgTable(
  "tv_pairing_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** 4 numeric digits, e.g. "4812" */
    pairingCode: text("pairing_code").notNull(),
    /** 'pending' | 'linked' | 'expired' */
    status: text("status")
      .notNull()
      .default("pending")
      .$type<"pending" | "linked" | "expired">(),
    linkedDisplayId: uuid("linked_display_id").references(
      () => tvDisplays.id,
      { onDelete: "set null" },
    ),
    /** Token returned to the TV after admin validation. */
    finalAccessToken: text("final_access_token"),
    /** Optional fingerprint (UA + screen size hash) to dedupe attempts. */
    deviceFingerprint: text("device_fingerprint"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    validatedByUserId: uuid("validated_by_user_id").references(
      () => users.id,
      { onDelete: "set null" },
    ),
    validatedAt: timestamp("validated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Partial unique: only enforce uniqueness for sessions still pending.
    // Expired/linked sessions can free up codes for reuse.
    uniqueIndex("tv_pairing_pending_code_idx")
      .on(table.pairingCode)
      .where(sql`status = 'pending'`),
    index("tv_pairing_status_idx").on(table.status),
    check(
      "tv_pairing_code_format_check",
      sql`${table.pairingCode} ~ '^[A-Z2-9]{6}$'`,
    ),
    check(
      "tv_pairing_status_check",
      sql`${table.status} IN ('pending', 'linked', 'expired')`,
    ),
  ],
);

/**
 * Media library: images and videos uploaded by the admin.
 * Stored in Supabase Storage bucket "tv-media".
 */
/**
 * Slide config for non-file slides ("menu_board" type). Stored as JSONB so we
 * can evolve the shape without further migrations. Ignored for image/video.
 */
export type TvMenuBoardConfig = {
  kind: "menu_board";
  /** Big heading shown at the top of the board. */
  title: string;
  /** Optional subtitle / tagline under the heading. */
  subtitle?: string;
  /** Which menu items to pull. */
  source:
    | { type: "category"; categoryId: string }
    | { type: "all_available" }
    | { type: "daily" };
  /** Visual layout. */
  layout: "list" | "grid";
  showPrices: boolean;
  showDescriptions: boolean;
  showImages: boolean;
  /** Which currency(ies) to render next to each price. */
  currency: "usd" | "ves" | "both";
  /** Optional manual cap on total items fetched across all pages. */
  maxItems?: number;
  /**
   * Items shown per page. When items exceed this, additional slides are
   * generated automatically so the carousel pages through the full menu.
   * Defaults: 6 for grid, 8 for list.
   */
  itemsPerPage?: number;
};

export const tvMedia = pgTable(
  "tv_media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    /** 'image' | 'video' | 'menu_board' */
    type: text("type")
      .notNull()
      .$type<"image" | "video" | "menu_board">(),
    storageBucket: text("storage_bucket").notNull().default("tv-media"),
    /** Path within bucket. NULL for menu_board slides (no file). */
    storagePath: text("storage_path"),
    /** ImageKit fileId for the main file — used for deletion. */
    imagekitFileId: text("imagekit_file_id"),
    /** ImageKit fileId for the thumbnail — used for deletion. */
    thumbnailFileId: text("thumbnail_file_id"),
    /** Public URL. NULL for menu_board slides. */
    publicUrl: text("public_url"),
    thumbnailUrl: text("thumbnail_url"),
    /** NULL for menu_board slides. */
    mimeType: text("mime_type"),
    /** NULL for menu_board slides. */
    fileSizeBytes: integer("file_size_bytes"),
    width: integer("width"),
    height: integer("height"),
    /** For images & menu boards: how long to display. For videos: informative. */
    durationSeconds: integer("duration_seconds").notNull().default(10),
    /** Order within the default playlist. Lower = earlier. */
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    /**
     * TRUE  → visible in the global library and the default playlist.
     * FALSE → uploaded directly for a specific event; hidden from the
     *         library and from other events' media pickers.
     */
    isGlobal: boolean("is_global").notNull().default(true),
    /**
     * If true, this video plays muted regardless of display.audioEnabled.
     * Defaults to true so silent ads don't surprise diners; admin opts-in
     * per-clip when sound is desired.
     */
    muted: boolean("muted").notNull().default(true),
    /**
     * Renderer config for non-file slide types. Currently used by type='menu_board'.
     */
    slideConfig: jsonb("slide_config").$type<TvMenuBoardConfig | null>(),
    /* ─── Dayparting (time-of-day scheduling) ────────────────────────────
     *
     * All three NULL = play always (default behavior).
     *
     * `daypartStartMinutes`/`daypartEndMinutes` = minutes since local midnight,
     * 0..1439. If `start <= end` the window is the natural interval. If
     * `start > end` the window wraps midnight (e.g. 22:00→02:00).
     *
     * `daypartDaysMask` is a 7-bit field, bit 0 = Sunday, bit 6 = Saturday.
     * NULL = every day.
     *
     * Times are interpreted in the restaurant's local timezone ("America/Caracas").
     */
    daypartStartMinutes: integer("daypart_start_minutes"),
    daypartEndMinutes: integer("daypart_end_minutes"),
    daypartDaysMask: integer("daypart_days_mask"),
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "tv_media_type_check",
      sql`${table.type} IN ('image', 'video', 'menu_board')`,
    ),
    check(
      "tv_media_duration_check",
      sql`${table.durationSeconds} > 0 AND ${table.durationSeconds} <= 600`,
    ),
    check(
      "tv_media_size_check",
      sql`${table.fileSizeBytes} IS NULL OR ${table.fileSizeBytes} >= 0`,
    ),
    check(
      "tv_media_daypart_start_check",
      sql`${table.daypartStartMinutes} IS NULL OR (${table.daypartStartMinutes} >= 0 AND ${table.daypartStartMinutes} <= 1439)`,
    ),
    check(
      "tv_media_daypart_end_check",
      sql`${table.daypartEndMinutes} IS NULL OR (${table.daypartEndMinutes} >= 0 AND ${table.daypartEndMinutes} <= 1439)`,
    ),
    check(
      "tv_media_daypart_days_check",
      sql`${table.daypartDaysMask} IS NULL OR (${table.daypartDaysMask} >= 0 AND ${table.daypartDaysMask} <= 127)`,
    ),
  ],
);

/**
 * Special events (weddings, festivals, themed nights).
 * When active and assigned to a TV, overrides the default playlist.
 */
export const tvEvents = pgTable("tv_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  /** Optional date range. NULL means always active when isActive=true. */
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(false),
  /** If true, ignore tvEventAssignments and apply to ALL TVs. */
  appliesToAllDisplays: boolean("applies_to_all_displays")
    .notNull()
    .default(false),
  createdByUserId: uuid("created_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Junction: which media items belong to an event, and in what order.
 * Cascade delete when event is removed (media stays in library).
 */
export const tvEventMedia = pgTable(
  "tv_event_media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => tvEvents.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => tvMedia.id, { onDelete: "cascade" }),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("tv_event_media_unique_idx").on(table.eventId, table.mediaId),
  ],
);

/**
 * Junction: which TVs are showing a given event.
 * If event.appliesToAllDisplays=true, this table is ignored.
 */
export const tvEventAssignments = pgTable(
  "tv_event_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => tvEvents.id, { onDelete: "cascade" }),
    displayId: uuid("display_id")
      .notNull()
      .references(() => tvDisplays.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("tv_event_assignments_unique_idx").on(
      table.eventId,
      table.displayId,
    ),
  ],
);

/**
 * Junction: which media items from the global library a given display should
 * play in its default rotation. Per-display ordering is supported.
 *
 * Resolution logic:
 *   - If a display has ≥1 row here → playlist = exactly those items.
 *   - If a display has 0 rows here → fallback to ALL global media
 *     (back-compat: new TVs show the whole library by default).
 *
 * Events still override the default playlist when active.
 */
export const tvDisplayMedia = pgTable(
  "tv_display_media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    displayId: uuid("display_id")
      .notNull()
      .references(() => tvDisplays.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => tvMedia.id, { onDelete: "cascade" }),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("tv_display_media_unique_idx").on(
      table.displayId,
      table.mediaId,
    ),
  ],
);

export type TvDisplay = typeof tvDisplays.$inferSelect;
export type TvDisplayInsert = typeof tvDisplays.$inferInsert;
export type TvPairingSession = typeof tvPairingSessions.$inferSelect;
export type TvMedia = typeof tvMedia.$inferSelect;
export type TvMediaInsert = typeof tvMedia.$inferInsert;
export type TvEvent = typeof tvEvents.$inferSelect;
export type TvEventInsert = typeof tvEvents.$inferInsert;
export type TvEventMedia = typeof tvEventMedia.$inferSelect;
export type TvEventAssignment = typeof tvEventAssignments.$inferSelect;
export type TvDisplayMedia = typeof tvDisplayMedia.$inferSelect;
