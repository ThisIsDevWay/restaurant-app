-- Distinguish between media that belongs to the global default playlist
-- (is_global = TRUE) and media uploaded specifically for an event
-- (is_global = FALSE). Event-specific media is hidden from the library
-- and from other events' pickers.

ALTER TABLE tv_media
  ADD COLUMN IF NOT EXISTS is_global BOOLEAN NOT NULL DEFAULT TRUE;

-- Existing rows keep is_global = TRUE (they were all global before).
COMMENT ON COLUMN tv_media.is_global IS
  'TRUE = visible in the default library; FALSE = uploaded for a specific event only';
