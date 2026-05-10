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
      sql`${table.pairingCode} ~ '^[0-9]{4}$'`,
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
export const tvMedia = pgTable(
  "tv_media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    /** 'image' | 'video' */
    type: text("type").notNull().$type<"image" | "video">(),
    storageBucket: text("storage_bucket").notNull().default("tv-media"),
    /** Path within bucket, e.g. "2026/05/abc123.jpg" */
    storagePath: text("storage_path").notNull(),
    publicUrl: text("public_url").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    mimeType: text("mime_type").notNull(),
    fileSizeBytes: integer("file_size_bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    /** For images: how long to display. For videos: actual duration (informative). */
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
      sql`${table.type} IN ('image', 'video')`,
    ),
    check(
      "tv_media_duration_check",
      sql`${table.durationSeconds} > 0 AND ${table.durationSeconds} <= 600`,
    ),
    check(
      "tv_media_size_check",
      sql`${table.fileSizeBytes} >= 0`,
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
