import { AppError } from "@/application/errors";
import { NotionClient } from "@/infrastructure/notion/notion-client";
import { isPlainObject, normalizeFieldName } from "@/shared/utils/type-guards";

type NotionBlockListResponse = {
  results: Array<Record<string, unknown>>;
};

type ChildDatabaseRef = {
  databaseId: string;
  fallbackTitle: string | null;
};

type NotionDatabaseResponse = {
  id: string;
  url?: string;
  title?: unknown[];
  data_sources?: Array<{
    id?: string;
  }>;
};

export type SourcePageDataSourceCandidate = {
  databaseId: string;
  databaseTitle: string;
  dataSourceId: string;
  url: string | null;
};

export class ListNotionSourcePageDataSourcesService {
  constructor(private readonly notionClient: NotionClient) {}

  async execute(sourcePageIdRaw: string): Promise<SourcePageDataSourceCandidate[]> {
    const sourcePageId = sourcePageIdRaw.trim();
    if (!sourcePageId) {
      throw new AppError("VALIDATION_ERROR", "NOTION_SOURCE_PAGE_ID is not configured");
    }

    const blocks = (await this.notionClient.retrieveAllBlockChildren(
      sourcePageId
    )) as NotionBlockListResponse;
    const childDatabases = collectChildDatabases(blocks.results);
    if (childDatabases.length === 0) {
      return [];
    }

    const candidates: SourcePageDataSourceCandidate[] = [];
    for (const ref of childDatabases) {
      const database = (await this.notionClient.retrieveDatabase(ref.databaseId)) as NotionDatabaseResponse;
      const dataSourceId = normalizeFieldName(database.data_sources?.[0]?.id);
      if (!dataSourceId) {
        continue;
      }

      candidates.push({
        databaseId: database.id,
        databaseTitle: readDatabaseTitle(database.title, ref.fallbackTitle),
        dataSourceId,
        url: normalizeFieldName(database.url),
      });
    }

    const deduped = new Map<string, SourcePageDataSourceCandidate>();
    for (const candidate of candidates) {
      if (!deduped.has(candidate.dataSourceId)) {
        deduped.set(candidate.dataSourceId, candidate);
      }
    }

    return [...deduped.values()].sort((a, b) => a.databaseTitle.localeCompare(b.databaseTitle));
  }
}

function collectChildDatabases(blocks: Array<Record<string, unknown>>): ChildDatabaseRef[] {
  const results: ChildDatabaseRef[] = [];
  const seen = new Set<string>();

  function walk(items: Array<Record<string, unknown>>): void {
    for (const block of items) {
      const blockType = typeof block.type === "string" ? block.type : "";
      const blockId = typeof block.id === "string" ? block.id : "";

      if (blockType === "child_database" && blockId) {
        if (!seen.has(blockId)) {
          seen.add(blockId);
          const fallbackTitle =
            isPlainObject(block.child_database) && typeof block.child_database.title === "string"
              ? block.child_database.title
              : null;
          results.push({ databaseId: blockId, fallbackTitle });
        }
      }

      const blockData = blockType ? block[blockType] : undefined;
      if (isPlainObject(blockData) && Array.isArray(blockData.children)) {
        const children = blockData.children.filter(isPlainObject);
        walk(children);
      }
    }
  }

  walk(blocks);
  return results;
}

function readDatabaseTitle(titleValue: unknown[] | undefined, fallbackTitle: string | null): string {
  if (Array.isArray(titleValue)) {
    const title = titleValue
      .map((item) => {
        if (!isPlainObject(item)) {
          return "";
        }
        const plainText = item.plain_text;
        if (typeof plainText === "string") {
          return plainText;
        }
        if (isPlainObject(item.text) && typeof item.text.content === "string") {
          return item.text.content;
        }
        return "";
      })
      .join("")
      .trim();

    if (title.length > 0) {
      return title;
    }
  }

  if (fallbackTitle && fallbackTitle.trim().length > 0) {
    return fallbackTitle.trim();
  }

  return "Untitled";
}
