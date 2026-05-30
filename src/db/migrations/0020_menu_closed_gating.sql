ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "status_override" text NOT NULL DEFAULT 'auto';
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "hide_menu_when_closed" boolean NOT NULL DEFAULT false;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "pre_open_visibility_minutes" integer NOT NULL DEFAULT 0;
