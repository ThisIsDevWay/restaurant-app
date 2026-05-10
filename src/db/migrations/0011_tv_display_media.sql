-- Per-display media selection: each TV can override the default global
-- playlist with its own curated subset of the general library.
--
-- Behavior:
--   • If a display has ≥1 row here  → playlist = exactly those items.
--   • If a display has 0 rows here  → playlist = all global media
--     (back-compat: existing TVs keep showing everything by default).
--
-- Events still take priority over both.

CREATE TABLE IF NOT EXISTS tv_display_media (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_id    UUID NOT NULL REFERENCES tv_displays(id) ON DELETE CASCADE,
  media_id      UUID NOT NULL REFERENCES tv_media(id)    ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS tv_display_media_unique_idx
  ON tv_display_media (display_id, media_id);

CREATE INDEX IF NOT EXISTS tv_display_media_display_idx
  ON tv_display_media (display_id);
