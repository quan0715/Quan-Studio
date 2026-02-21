-- CreateEnum
CREATE TYPE "public"."NotionModelProjectionKind" AS ENUM ('flat_list');

-- CreateEnum
CREATE TYPE "public"."NotionModelFieldType" AS ENUM ('title', 'rich_text', 'select', 'multi_select', 'status', 'number', 'date', 'checkbox', 'url', 'builtin');

-- CreateTable
CREATE TABLE "public"."notion_model_definitions" (
  "id" TEXT NOT NULL,
  "model_key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "default_display_name" TEXT NOT NULL,
  "schema_source" TEXT NOT NULL,
  "projection_kind" "public"."NotionModelProjectionKind" NOT NULL DEFAULT 'flat_list',
  "projection_config_json" JSONB NOT NULL DEFAULT '{}',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "notion_model_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notion_model_fields" (
  "id" TEXT NOT NULL,
  "model_definition_id" TEXT NOT NULL,
  "field_key" TEXT NOT NULL,
  "app_field" TEXT NOT NULL,
  "expected_type" "public"."NotionModelFieldType" NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "description" TEXT NOT NULL,
  "default_notion_field" TEXT,
  "builtin_field" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "notion_model_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notion_model_bindings" (
  "id" TEXT NOT NULL,
  "model_definition_id" TEXT NOT NULL,
  "data_source_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "notion_model_bindings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notion_model_definitions_model_key_key" ON "public"."notion_model_definitions"("model_key");

-- CreateIndex
CREATE UNIQUE INDEX "notion_model_definitions_schema_source_key" ON "public"."notion_model_definitions"("schema_source");

-- CreateIndex
CREATE INDEX "notion_model_definitions_is_active_idx" ON "public"."notion_model_definitions"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "notion_model_fields_app_field_key" ON "public"."notion_model_fields"("app_field");

-- CreateIndex
CREATE UNIQUE INDEX "notion_model_fields_model_definition_id_field_key_key" ON "public"."notion_model_fields"("model_definition_id", "field_key");

-- CreateIndex
CREATE INDEX "notion_model_fields_model_definition_id_sort_order_idx" ON "public"."notion_model_fields"("model_definition_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "notion_model_bindings_model_definition_id_key" ON "public"."notion_model_bindings"("model_definition_id");

-- CreateIndex
CREATE INDEX "notion_model_bindings_data_source_id_idx" ON "public"."notion_model_bindings"("data_source_id");

-- AddForeignKey
ALTER TABLE "public"."notion_model_fields" ADD CONSTRAINT "notion_model_fields_model_definition_id_fkey" FOREIGN KEY ("model_definition_id") REFERENCES "public"."notion_model_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notion_model_bindings" ADD CONSTRAINT "notion_model_bindings_model_definition_id_fkey" FOREIGN KEY ("model_definition_id") REFERENCES "public"."notion_model_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
