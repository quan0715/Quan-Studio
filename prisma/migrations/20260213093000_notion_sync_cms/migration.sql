-- Enable UUID generation for Post.id default
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "public"."NotionSyncJobStatus" AS ENUM ('pending', 'processing', 'succeeded', 'failed');

-- CreateEnum
CREATE TYPE "public"."NotionSyncTrigger" AS ENUM ('button', 'manual', 'retry');

-- AlterTable: posts
ALTER TABLE "public"."posts"
  ADD COLUMN "notion_page_id" TEXT,
  ADD COLUMN "notion_last_edited_at" TIMESTAMP(3),
  ADD COLUMN "synced_at" TIMESTAMP(3),
  ADD COLUMN "sync_error" TEXT;

UPDATE "public"."posts"
SET "notion_page_id" = "id"::text
WHERE "notion_page_id" IS NULL;

ALTER TABLE "public"."posts"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "notion_page_id" SET NOT NULL;

-- CreateTable
CREATE TABLE "public"."notion_sync_jobs" (
  "id" TEXT NOT NULL,
  "page_id" TEXT NOT NULL,
  "trigger_type" "public"."NotionSyncTrigger" NOT NULL,
  "status" "public"."NotionSyncJobStatus" NOT NULL DEFAULT 'pending',
  "attempt" INTEGER NOT NULL DEFAULT 0,
  "max_attempts" INTEGER NOT NULL DEFAULT 5,
  "next_run_at" TIMESTAMP(3),
  "locked_at" TIMESTAMP(3),
  "locked_by" TEXT,
  "payload_json" JSONB,
  "dedupe_key" TEXT NOT NULL,
  "error_message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "notion_sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "posts_notion_page_id_key" ON "public"."posts"("notion_page_id");

-- CreateIndex
CREATE INDEX "posts_synced_at_idx" ON "public"."posts"("synced_at");

-- CreateIndex
CREATE UNIQUE INDEX "notion_sync_jobs_dedupe_key_key" ON "public"."notion_sync_jobs"("dedupe_key");

-- CreateIndex
CREATE INDEX "notion_sync_jobs_status_next_run_at_idx" ON "public"."notion_sync_jobs"("status", "next_run_at");

-- CreateIndex
CREATE INDEX "notion_sync_jobs_updated_at_idx" ON "public"."notion_sync_jobs"("updated_at");
