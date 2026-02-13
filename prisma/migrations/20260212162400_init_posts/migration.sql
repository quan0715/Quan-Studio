-- CreateEnum
CREATE TYPE "public"."PostStatus" AS ENUM ('draft', 'published');

-- CreateTable
CREATE TABLE "public"."posts" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "status" "public"."PostStatus" NOT NULL DEFAULT 'draft',
    "content_json" JSONB NOT NULL,
    "cover_url" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "posts_slug_key" ON "public"."posts"("slug");

-- CreateIndex
CREATE INDEX "posts_status_idx" ON "public"."posts"("status");

-- CreateIndex
CREATE INDEX "posts_published_at_idx" ON "public"."posts"("published_at");
