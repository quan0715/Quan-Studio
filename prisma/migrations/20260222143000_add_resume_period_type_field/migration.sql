-- Add `resume.periodType` field to dynamic resume model definition if missing.
INSERT INTO "public"."notion_model_fields" (
  "id",
  "model_definition_id",
  "field_key",
  "app_field",
  "expected_type",
  "required",
  "description",
  "default_notion_field",
  "builtin_field",
  "sort_order",
  "created_at",
  "updated_at"
)
SELECT
  concat('seed-periodType-', md."id"),
  md."id",
  'periodType',
  'resume.periodType',
  'select',
  false,
  '時間型態（event 或 experience）',
  'Period Type',
  NULL,
  COALESCE((
    SELECT MAX(f."sort_order") + 1
    FROM "public"."notion_model_fields" f
    WHERE f."model_definition_id" = md."id"
  ), 0),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "public"."notion_model_definitions" md
WHERE md."model_key" = 'resume'
  AND NOT EXISTS (
    SELECT 1
    FROM "public"."notion_model_fields" f
    WHERE f."model_definition_id" = md."id"
      AND (f."field_key" = 'periodType' OR f."app_field" = 'resume.periodType')
  );

-- If field exists under `periodType`, align its definition to latest expectation.
UPDATE "public"."notion_model_fields" f
SET
  "app_field" = 'resume.periodType',
  "expected_type" = 'select',
  "required" = false,
  "description" = '時間型態（event 或 experience）',
  "default_notion_field" = 'Period Type',
  "builtin_field" = NULL,
  "updated_at" = CURRENT_TIMESTAMP
WHERE f."field_key" = 'periodType';
