-- AlterTable
ALTER TABLE "public"."posts"
ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
