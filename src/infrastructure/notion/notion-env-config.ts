import { AppError } from "@/application/errors";
import { extractPropertyText } from "@/domain/notion/notion-property-readers";
import { NotionClient } from "@/infrastructure/notion/notion-client";

type NotionDataSourceQueryResponse = {
  results: Array<Record<string, unknown>>;
};

export type NotionEnvSnapshot = {
  notionEnvDatabaseId: string;
  notionEnvDataSourceId: string;
  values: Map<string, string>;
  availableKeys: string[];
};

export const STUDIO_USERNAME_KEYS = ["ADMIN_USER_NAME", "STUDIO_ADMIN_USERNAME"];
export const STUDIO_PASSWORD_KEYS = ["ADMIN_USER_PWD", "ADMIN_USER_PASSWORD", "STUDIO_ADMIN_PASSWORD"];

export async function fetchNotionEnvSnapshot(
  notionClient: NotionClient,
  notionEnvDatabaseIdRaw: string
): Promise<NotionEnvSnapshot> {
  const notionEnvDatabaseId = normalizeNotionId(notionEnvDatabaseIdRaw);
  if (!notionEnvDatabaseId) {
    throw new AppError("VALIDATION_ERROR", "NOTION_ENV_DATABASE_ID is missing");
  }

  const database = await notionClient.retrieveDatabase(notionEnvDatabaseId);
  const notionEnvDataSourceId = database.data_sources?.[0]?.id?.trim() ?? "";

  if (!notionEnvDataSourceId) {
    throw new AppError("VALIDATION_ERROR", "NOTION.ENV database has no data source");
  }

  const query = (await notionClient.queryDataSourceWithId(
    notionEnvDataSourceId,
    100
  )) as NotionDataSourceQueryResponse;
  const values = extractNotionEnvMap(query.results);

  return {
    notionEnvDatabaseId,
    notionEnvDataSourceId,
    values,
    availableKeys: [...values.keys()].sort(),
  };
}

export function resolveFirstNotionEnvValue(
  values: Map<string, string>,
  candidates: string[]
): { key: string; value: string } | null {
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeKey(candidate);
    if (!values.has(normalizedCandidate)) {
      continue;
    }

    return {
      key: normalizedCandidate,
      value: (values.get(normalizedCandidate) ?? "").trim(),
    };
  }

  return null;
}

function normalizeNotionId(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const compact = trimmed.replace(/-/g, "");
  if (/^[0-9a-fA-F]{32}$/.test(compact)) {
    const normalized = compact.toLowerCase();
    return `${normalized.slice(0, 8)}-${normalized.slice(8, 12)}-${normalized.slice(
      12,
      16
    )}-${normalized.slice(16, 20)}-${normalized.slice(20)}`;
  }

  const match = trimmed.match(/[0-9a-fA-F]{32}/);
  if (match) {
    return normalizeNotionId(match[0]);
  }

  return trimmed;
}

function extractNotionEnvMap(rows: Array<Record<string, unknown>>): Map<string, string> {
  const map = new Map<string, string>();

  for (const row of rows) {
    const properties =
      row.properties && typeof row.properties === "object"
        ? (row.properties as Record<string, unknown>)
        : null;
    if (!properties) {
      continue;
    }

    const key = extractPropertyText(properties, "KEY");
    const value = extractPropertyText(properties, "VALUE");
    if (!key || !value) {
      continue;
    }

    map.set(normalizeKey(key), value);
  }

  return map;
}

function normalizeKey(value: string): string {
  return value.trim().toUpperCase();
}
