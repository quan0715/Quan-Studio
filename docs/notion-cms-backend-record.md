# Notion CMS Backend Record

Updated at: 2026-02-13 09:51 UTC

## Parent Page
- URL: https://www.notion.so/Quan-Studio-306d3aba0aea80ce90a5e5d2dd7bd140
- Page ID: `306d3aba-0aea-80ce-90a5-e5d2dd7bd140`

## CMS Database
- URL: https://www.notion.so/b32a00d73d0341e78d326400955660bc
- Database ID: `b32a00d7-3d03-41e7-8d32-6400955660bc`
- Data Source ID: `8f1988c6-9dff-4c79-bbb3-bd44bd45be02`

## Properties
- `Name` (title)
- `Slug` (rich_text)
- `Status` (select: Draft / Published)
- `Excerpt` (rich_text)
- `Cover` (files)
- `Published At` (date)

## Verification Page
- URL: https://www.notion.so/Notion-Sync-Smoke-Test-306d3aba0aea8111af6eec1d28604e2a
- Page ID: `306d3aba-0aea-8111-af6e-ec1d28604e2a`
- Sync result: `succeeded` (manual and webhook flow both verified)

## Local Env
Set in `/Users/quan/quan-studio/docker/dev.env`:
- `NOTION_SOURCE_PAGE_ID=<source-page-id>`
- Data source IDs are selected in Studio (`/studio/settings/notion`) and persisted to `notion_model_bindings`.
- Explicit field overrides are persisted to `integration_configs` key:
  - `notion.schema.field_mapping`
