-- CreateTable
CREATE TABLE "public"."integration_configs" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "integration_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "integration_configs_key_key" ON "public"."integration_configs"("key");

-- CreateIndex
CREATE INDEX "integration_configs_key_idx" ON "public"."integration_configs"("key");
