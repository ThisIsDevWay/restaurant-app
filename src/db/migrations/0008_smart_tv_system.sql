-- Smart TV Advertising and Pairing System
-- Adds 6 new tables: tv_displays, tv_pairing_sessions, tv_media, tv_events,
-- tv_event_media, tv_event_assignments.

CREATE TABLE IF NOT EXISTS "tv_displays" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text DEFAULT 'TV sin nombre' NOT NULL,
  "display_token" text NOT NULL,
  "orientation" text DEFAULT 'auto' NOT NULL,
  "rotation_degrees" integer DEFAULT 0 NOT NULL,
  "last_seen_at" timestamp with time zone,
  "last_reported_orientation" text,
  "last_reported_size" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "linked_by_user_id" uuid,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "tv_displays_display_token_unique" UNIQUE ("display_token"),
  CONSTRAINT "tv_displays_orientation_check" CHECK ("orientation" IN ('auto', 'landscape', 'portrait')),
  CONSTRAINT "tv_displays_rotation_check" CHECK ("rotation_degrees" IN (0, 90, 180, 270))
);

ALTER TABLE "tv_displays"
  ADD CONSTRAINT "tv_displays_linked_by_user_id_users_id_fk"
  FOREIGN KEY ("linked_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "tv_pairing_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "pairing_code" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "linked_display_id" uuid,
  "final_access_token" text,
  "device_fingerprint" text,
  "expires_at" timestamp with time zone NOT NULL,
  "validated_by_user_id" uuid,
  "validated_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "tv_pairing_code_format_check" CHECK ("pairing_code" ~ '^[0-9]{4}$'),
  CONSTRAINT "tv_pairing_status_check" CHECK ("status" IN ('pending', 'linked', 'expired'))
);

ALTER TABLE "tv_pairing_sessions"
  ADD CONSTRAINT "tv_pairing_sessions_linked_display_id_tv_displays_id_fk"
  FOREIGN KEY ("linked_display_id") REFERENCES "tv_displays"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "tv_pairing_sessions"
  ADD CONSTRAINT "tv_pairing_sessions_validated_by_user_id_users_id_fk"
  FOREIGN KEY ("validated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- Partial unique index: only enforce uniqueness on codes that are still pending.
-- Allows reuse of codes once their session expires or is consumed.
CREATE UNIQUE INDEX IF NOT EXISTS "tv_pairing_pending_code_idx"
  ON "tv_pairing_sessions" ("pairing_code")
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS "tv_pairing_status_idx"
  ON "tv_pairing_sessions" ("status");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "tv_media" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "type" text NOT NULL,
  "storage_bucket" text DEFAULT 'tv-media' NOT NULL,
  "storage_path" text NOT NULL,
  "public_url" text NOT NULL,
  "thumbnail_url" text,
  "mime_type" text NOT NULL,
  "file_size_bytes" integer NOT NULL,
  "width" integer,
  "height" integer,
  "duration_seconds" integer DEFAULT 10 NOT NULL,
  "display_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "uploaded_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "tv_media_type_check" CHECK ("type" IN ('image', 'video')),
  CONSTRAINT "tv_media_duration_check" CHECK ("duration_seconds" > 0 AND "duration_seconds" <= 600),
  CONSTRAINT "tv_media_size_check" CHECK ("file_size_bytes" >= 0)
);

ALTER TABLE "tv_media"
  ADD CONSTRAINT "tv_media_uploaded_by_user_id_users_id_fk"
  FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "tv_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "starts_at" timestamp with time zone,
  "ends_at" timestamp with time zone,
  "is_active" boolean DEFAULT false NOT NULL,
  "applies_to_all_displays" boolean DEFAULT false NOT NULL,
  "created_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "tv_events"
  ADD CONSTRAINT "tv_events_created_by_user_id_users_id_fk"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "tv_event_media" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_id" uuid NOT NULL,
  "media_id" uuid NOT NULL,
  "display_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "tv_event_media"
  ADD CONSTRAINT "tv_event_media_event_id_tv_events_id_fk"
  FOREIGN KEY ("event_id") REFERENCES "tv_events"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "tv_event_media"
  ADD CONSTRAINT "tv_event_media_media_id_tv_media_id_fk"
  FOREIGN KEY ("media_id") REFERENCES "tv_media"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE UNIQUE INDEX IF NOT EXISTS "tv_event_media_unique_idx"
  ON "tv_event_media" ("event_id", "media_id");

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "tv_event_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_id" uuid NOT NULL,
  "display_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "tv_event_assignments"
  ADD CONSTRAINT "tv_event_assignments_event_id_tv_events_id_fk"
  FOREIGN KEY ("event_id") REFERENCES "tv_events"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "tv_event_assignments"
  ADD CONSTRAINT "tv_event_assignments_display_id_tv_displays_id_fk"
  FOREIGN KEY ("display_id") REFERENCES "tv_displays"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE UNIQUE INDEX IF NOT EXISTS "tv_event_assignments_unique_idx"
  ON "tv_event_assignments" ("event_id", "display_id");
