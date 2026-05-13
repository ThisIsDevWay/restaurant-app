-- Migration: add name, image columns and make password_hash nullable
-- Apply: psql $DATABASE_URL_DIRECT -f this_file.sql

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "image" text;
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;
