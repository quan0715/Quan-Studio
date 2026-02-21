# Notion Module Usage

Updated at: 2026-02-21

## 1. Core Architecture (DB-First)

Notion model metadata is fully dynamic and stored in DB:

- `notion_model_definitions`
- `notion_model_fields`
- `notion_model_bindings`

Runtime query/sync/schema-check all read from these tables. Static registry files are not used by runtime flow.

Related files:
- `/Users/quan/quan-studio/src/domain/notion-model-definition/notion-model-definition.ts`
- `/Users/quan/quan-studio/src/domain/notion-model-definition/notion-model-definition-repository.ts`
- `/Users/quan/quan-studio/src/infrastructure/repositories/prisma-notion-model-definition-repository.ts`

## 2. Runtime Config

Env:
- `NOTION_SOURCE_PAGE_ID`: source page for candidate DB scan.

Integration config:
- `integration_configs.key = notion.schema.field_mapping`

`notion.schema.field_mapping` shape:

```json
{
  "version": 1,
  "sources": {
    "resume": {
      "resume.name": "Name",
      "resume.location": "Location"
    }
  }
}
```

## 3. Field Rule and Types

App field naming rule:
- `appField` must match model prefix: `<modelKey>.<fieldName>`.
- Example: `resume.location`, `project.githubUrl`.

Supported field types:
- `title`
- `rich_text`
- `select`
- `multi_select`
- `status`
- `number`
- `date`
- `checkbox`
- `url`
- `file`
- `media`
- `builtin` (`page.icon`, `page.cover`, `page.created_time`, `page.last_edited_time`)

Validation logic:
- `/Users/quan/quan-studio/src/application/services/notion-model-definition-validator.ts`

## 4. Studio APIs

Model definitions:
- `GET /api/studio/settings/notion/model-definitions`
- `POST /api/studio/settings/notion/model-definitions`
- `PATCH /api/studio/settings/notion/model-definitions/[modelKey]`
- `POST /api/studio/settings/notion/model-definitions/[modelKey]/fields`
- `PATCH /api/studio/settings/notion/model-definitions/[modelKey]/fields/[fieldKey]`
- `DELETE /api/studio/settings/notion/model-definitions/[modelKey]/fields/[fieldKey]`

Model settings / binding:
- `GET /api/studio/settings/notion/models`
- `POST /api/studio/settings/notion/models/refresh`
- `PATCH /api/studio/settings/notion/models/select-source`

Schema mapping:
- `GET /api/studio/settings/notion/schema-mapping`
- `PATCH /api/studio/settings/notion/schema-mapping`

Provision / schema migrate:
- `POST /api/studio/settings/notion/models/provision`
- `POST /api/studio/settings/notion/models/migrate`

## 5. Public Typed Data API

Generic query endpoint:
- `GET /api/public/models/[modelKey]?limit=...`

Response:

```ts
type PublicModelQueryResponse = {
  meta: {
    modelKey: string;
    dataSourceId: string;
    generatedAt: string;
    schemaVersion: number;
  };
  rows: Array<Record<string, unknown>>;
};
```

Wrappers (same query core):
- `GET /api/public/resume` -> model `resume`
- `GET /api/public/projects` -> model `project`

Core implementation:
- `/Users/quan/quan-studio/src/application/use-cases/query-notion-model.usecase.ts`
- `/Users/quan/quan-studio/src/application/services/query-notion-model-data.service.ts`
- `/Users/quan/quan-studio/src/application/services/notion-model-mapper.service.ts`

## 6. Source Page Candidate Scan

Candidate scan reads `NOTION_SOURCE_PAGE_ID`:
1. list page blocks (recursive)
2. find `child_database`
3. retrieve `database.id`, `title`, first `data_source_id`, `url`
4. dedupe + sort

Implementation:
- `/Users/quan/quan-studio/src/application/services/list-notion-source-page-data-sources.service.ts`
- `/Users/quan/quan-studio/src/application/use-cases/manage-notion-model-settings.usecase.ts`

## 7. User Operation Flow (Studio)

1. Create model (model key, label, display name).
2. Add fields (fieldKey/appField/type/required/notion field name).
3. Bind source data source id.
4. Check schema mapping.
5. Apply explicit mapping override only when Notion field names differ.
6. (Optional) provision/migrate schema.
7. Query data from `/api/public/models/[modelKey]`.

## 8. Add New Model SOP (No Code Path Changes)

Default path is UI/DB only, no core code modification:
1. Create model in Studio.
2. Add fields and types in Studio.
3. Bind data source.
4. Pass schema mapping.
5. Consume via `GET /api/public/models/[modelKey]`.

Only add code when you need custom view transformation in app layer.
