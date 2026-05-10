-- Smart TV audio support
-- Adds per-video mute toggle and per-display audio enable + volume controls.

ALTER TABLE "tv_media"
  ADD COLUMN IF NOT EXISTS "muted" boolean NOT NULL DEFAULT true;

ALTER TABLE "tv_displays"
  ADD COLUMN IF NOT EXISTS "audio_enabled" boolean NOT NULL DEFAULT false;

ALTER TABLE "tv_displays"
  ADD COLUMN IF NOT EXISTS "volume_percent" integer NOT NULL DEFAULT 80;

ALTER TABLE "tv_displays"
  ADD CONSTRAINT "tv_displays_volume_check"
  CHECK ("volume_percent" >= 0 AND "volume_percent" <= 100);
