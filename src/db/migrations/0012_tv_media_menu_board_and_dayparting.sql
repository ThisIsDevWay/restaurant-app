-- ─────────────────────────────────────────────────────────────────────────
-- 0012 — Live Menu Board slides + Dayparting (time-of-day scheduling)
-- ─────────────────────────────────────────────────────────────────────────
--
-- Two related features merged into one migration since they both touch
-- tv_media:
--
--   1. Menu Board slides — a new `type = 'menu_board'` that renders live
--      menu data instead of a stored file. File columns become NULLABLE
--      to support these. Rendering config lives in `slide_config` (JSONB).
--
--   2. Dayparting — three nullable columns let admins restrict any slide
--      to a specific time window and/or specific days of the week.
--      All NULL = play always (default).
-- ─────────────────────────────────────────────────────────────────────────

-- 1. Relax NOT NULL on file columns so menu boards (no file) can be inserted.
ALTER TABLE tv_media ALTER COLUMN storage_path    DROP NOT NULL;
ALTER TABLE tv_media ALTER COLUMN public_url      DROP NOT NULL;
ALTER TABLE tv_media ALTER COLUMN mime_type       DROP NOT NULL;
ALTER TABLE tv_media ALTER COLUMN file_size_bytes DROP NOT NULL;

-- 2. Add new columns.
ALTER TABLE tv_media
  ADD COLUMN IF NOT EXISTS slide_config           JSONB,
  ADD COLUMN IF NOT EXISTS daypart_start_minutes  INTEGER,
  ADD COLUMN IF NOT EXISTS daypart_end_minutes    INTEGER,
  ADD COLUMN IF NOT EXISTS daypart_days_mask      INTEGER;

-- 3. Replace the type check to allow the new 'menu_board' value.
ALTER TABLE tv_media DROP CONSTRAINT IF EXISTS tv_media_type_check;
ALTER TABLE tv_media
  ADD CONSTRAINT tv_media_type_check
  CHECK (type IN ('image', 'video', 'menu_board'));

-- 4. Allow NULL file_size_bytes (menu boards) while keeping the >=0 guard.
ALTER TABLE tv_media DROP CONSTRAINT IF EXISTS tv_media_size_check;
ALTER TABLE tv_media
  ADD CONSTRAINT tv_media_size_check
  CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0);

-- 5. Range checks for dayparting fields.
ALTER TABLE tv_media
  ADD CONSTRAINT tv_media_daypart_start_check
  CHECK (
    daypart_start_minutes IS NULL
    OR (daypart_start_minutes >= 0 AND daypart_start_minutes <= 1439)
  );
ALTER TABLE tv_media
  ADD CONSTRAINT tv_media_daypart_end_check
  CHECK (
    daypart_end_minutes IS NULL
    OR (daypart_end_minutes >= 0 AND daypart_end_minutes <= 1439)
  );
ALTER TABLE tv_media
  ADD CONSTRAINT tv_media_daypart_days_check
  CHECK (
    daypart_days_mask IS NULL
    OR (daypart_days_mask >= 0 AND daypart_days_mask <= 127)
  );

COMMENT ON COLUMN tv_media.slide_config IS
  'Renderer config for non-file slide types (currently type=menu_board).';
COMMENT ON COLUMN tv_media.daypart_start_minutes IS
  'Start of active window in minutes since local midnight (0..1439). NULL = no time restriction.';
COMMENT ON COLUMN tv_media.daypart_end_minutes IS
  'End of active window in minutes since local midnight (0..1439). When start > end the window wraps midnight.';
COMMENT ON COLUMN tv_media.daypart_days_mask IS
  '7-bit days mask: bit 0=Sun … bit 6=Sat. NULL = every day.';
