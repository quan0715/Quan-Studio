#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/docker/dev.env"

if [ -f "${ENV_FILE}" ]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required. Please install jq first."
  exit 1
fi

: "${NOTION_API_TOKEN:?NOTION_API_TOKEN is required}"
: "${NOTION_API_VERSION:=2025-09-03}"
: "${PARENT_PAGE_ID:?PARENT_PAGE_ID is required}"
: "${RESUME_DB_TITLE:=Quan Studio Resume}"

create_db_payload="$(mktemp)"
create_db_resp="$(mktemp)"
update_ds_payload="$(mktemp)"
update_ds_resp="$(mktemp)"

cleanup() {
  rm -f "${create_db_payload}" "${create_db_resp}" "${update_ds_payload}" "${update_ds_resp}"
}
trap cleanup EXIT

cat > "${create_db_payload}" <<JSON
{
  "parent": { "type": "page_id", "page_id": "${PARENT_PAGE_ID}" },
  "title": [
    { "type": "text", "text": { "content": "${RESUME_DB_TITLE}" } }
  ],
  "description": [
    { "type": "text", "text": { "content": "Resume CMS database for Quan Studio." } }
  ]
}
JSON

create_code=$(curl -sS -o "${create_db_resp}" -w "%{http_code}" https://api.notion.com/v1/databases \
  -H "Authorization: Bearer ${NOTION_API_TOKEN}" \
  -H "Notion-Version: ${NOTION_API_VERSION}" \
  -H "Content-Type: application/json" \
  --data @"${create_db_payload}")

if [ "${create_code}" != "200" ]; then
  echo "Failed to create resume database (HTTP ${create_code})"
  jq . "${create_db_resp}"
  exit 1
fi

database_id=$(jq -r '.id' "${create_db_resp}")
database_url=$(jq -r '.url' "${create_db_resp}")
data_source_id=$(jq -r '.data_sources[0].id' "${create_db_resp}")

if [ -z "${data_source_id}" ] || [ "${data_source_id}" = "null" ]; then
  echo "Resume database created but data source id is missing."
  jq . "${create_db_resp}"
  exit 1
fi

cat > "${update_ds_payload}" <<JSON
{
  "properties": {
    "Section": {
      "select": {
        "options": [
          { "name": "About", "color": "blue" },
          { "name": "Work Experience", "color": "green" },
          { "name": "Projects", "color": "purple" },
          { "name": "Education", "color": "yellow" },
          { "name": "Skills", "color": "orange" },
          { "name": "Certifications", "color": "pink" },
          { "name": "Awards", "color": "red" }
        ]
      }
    },
    "Group": { "rich_text": {} },
    "Summary": { "rich_text": {} },
    "Organization": { "rich_text": {} },
    "Role": { "rich_text": {} },
    "Location": { "rich_text": {} },
    "Start Date": { "date": {} },
    "End Date": { "date": {} },
    "Current": { "checkbox": {} },
    "Sort": { "number": { "format": "number" } },
    "Highlights": { "rich_text": {} },
    "Link": { "url": {} },
    "Tags": { "multi_select": {} },
    "Visibility": {
      "select": {
        "options": [
          { "name": "Public", "color": "green" },
          { "name": "Private", "color": "gray" }
        ]
      }
    }
  }
}
JSON

update_code=$(curl -sS -o "${update_ds_resp}" -w "%{http_code}" -X PATCH "https://api.notion.com/v1/data_sources/${data_source_id}" \
  -H "Authorization: Bearer ${NOTION_API_TOKEN}" \
  -H "Notion-Version: ${NOTION_API_VERSION}" \
  -H "Content-Type: application/json" \
  --data @"${update_ds_payload}")

if [ "${update_code}" != "200" ]; then
  echo "Resume database created but data source update failed (HTTP ${update_code})"
  jq . "${update_ds_resp}"
  exit 1
fi

echo "Resume Database URL: ${database_url}"
echo "Resume Database ID: ${database_id}"
echo "Resume Data Source ID: ${data_source_id}"
echo "Resume data source id created: ${data_source_id}"
echo "Save it in Studio Settings > Notion Data Source Settings."
