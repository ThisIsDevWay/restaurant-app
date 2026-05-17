-- Add portion_note to menu_items
-- Used to display protein quantity / portion info on digital menu and TV board
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "portion_note" text;
