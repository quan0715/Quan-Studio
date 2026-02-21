-- CreateTable
CREATE TABLE "public"."media_links" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "platform" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "description" TEXT,
  "is_visible" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "media_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_links_is_visible_sort_order_idx" ON "public"."media_links"("is_visible", "sort_order");

-- CreateIndex
CREATE INDEX "media_links_sort_order_idx" ON "public"."media_links"("sort_order");
