ALTER TABLE "menu_items" ADD COLUMN "is_prepackaged" boolean DEFAULT false NOT NULL;

-- Syncing print_jobs which seems to have been modified manually or migration was lost
-- ALTER TABLE "print_jobs" ADD COLUMN IF NOT EXISTS "raw_content" text;
-- ALTER TABLE "print_jobs" ADD COLUMN IF NOT EXISTS "target" text DEFAULT 'main';
-- ALTER TABLE "print_jobs" ADD COLUMN IF NOT EXISTS "printed_at" timestamp with time zone;
-- ALTER TABLE "print_jobs" DROP COLUMN IF EXISTS "completed_at";
