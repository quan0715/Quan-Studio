import { AppError } from "@/application/errors";
import { env } from "@/infrastructure/config/env";

type NotionPageResponse = {
  id: string;
  last_edited_time: string;
  properties: Record<string, unknown>;
};

type NotionBlocksListResponse = {
  object: "list";
  results: Array<Record<string, unknown>>;
  has_more: boolean;
  next_cursor: string | null;
};

type NotionDataSourceQueryResponse = {
  object: "list";
  results: Array<Record<string, unknown>>;
  has_more: boolean;
  next_cursor: string | null;
};

type NotionDatabaseResponse = {
  id: string;
  url?: string;
  data_sources?: Array<{
    id: string;
    name?: string;
  }>;
};

export class NotionClient {
  private readonly baseUrl = "https://api.notion.com/v1";

  async retrievePage(pageId: string): Promise<NotionPageResponse> {
    return this.request<NotionPageResponse>(`/pages/${encodeURIComponent(pageId)}`);
  }

  async retrieveDatabase(databaseId: string): Promise<NotionDatabaseResponse> {
    return this.request<NotionDatabaseResponse>(`/databases/${encodeURIComponent(databaseId)}`);
  }

  async retrieveBlockChildren(blockId: string, startCursor?: string): Promise<NotionBlocksListResponse> {
    const query = startCursor ? `?start_cursor=${encodeURIComponent(startCursor)}` : "";
    return this.request<NotionBlocksListResponse>(
      `/blocks/${encodeURIComponent(blockId)}/children${query}`
    );
  }

  async retrieveAllBlockChildren(blockId: string): Promise<NotionBlocksListResponse> {
    const results = await this.retrieveBlocksTree(blockId, new Set<string>());

    return {
      object: "list",
      results,
      has_more: false,
      next_cursor: null,
    };
  }

  private async retrieveBlocksTree(blockId: string, path: Set<string>): Promise<Array<Record<string, unknown>>> {
    if (path.has(blockId)) {
      return [];
    }

    path.add(blockId);
    const blocks = await this.retrieveAllBlockChildrenFlat(blockId);
    const hydratedBlocks: Array<Record<string, unknown>> = [];

    for (const block of blocks) {
      hydratedBlocks.push(await this.hydrateBlockChildren(block, path));
    }

    path.delete(blockId);
    return hydratedBlocks;
  }

  private async hydrateBlockChildren(
    block: Record<string, unknown>,
    path: Set<string>
  ): Promise<Record<string, unknown>> {
    const hasChildren = block.has_children === true;
    const blockId = typeof block.id === "string" ? block.id : "";
    const blockType = typeof block.type === "string" ? block.type : "";

    if (!hasChildren || !blockId || !blockType) {
      return block;
    }

    const children = await this.retrieveBlocksTree(blockId, path);
    const blockData = block[blockType];

    if (isPlainObject(blockData)) {
      return {
        ...block,
        [blockType]: {
          ...blockData,
          children,
        },
      };
    }

    return {
      ...block,
      [blockType]: {
        children,
      },
    };
  }

  private async retrieveAllBlockChildrenFlat(blockId: string): Promise<Array<Record<string, unknown>>> {
    let cursor: string | undefined;
    const results: Array<Record<string, unknown>> = [];
    let hasMore = true;

    while (hasMore) {
      const page = await this.retrieveBlockChildren(blockId, cursor);
      results.push(...page.results);
      hasMore = page.has_more;
      cursor = page.next_cursor ?? undefined;
    }
    return results;
  }

  async queryDataSourceWithId(
    dataSourceId: string,
    pageSize = 50,
    startCursor?: string
  ): Promise<NotionDataSourceQueryResponse> {
    return this.queryDataSourceById(dataSourceId, pageSize, startCursor, "data source id");
  }

  private async request<T>(
    path: string,
    options?: { method?: "GET" | "POST" | "PATCH"; body?: Record<string, unknown> }
  ): Promise<T> {
    if (!env.notionApiToken) {
      throw new AppError("NOTION_API_ERROR", "NOTION_API_TOKEN is not configured");
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: options?.method ?? "GET",
      headers: {
        Authorization: `Bearer ${env.notionApiToken}`,
        "Notion-Version": env.notionApiVersion,
        ...(options?.body ? { "Content-Type": "application/json" } : {}),
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new AppError("NOTION_API_ERROR", `notion request failed with status ${response.status}`);
    }

    return (await response.json()) as T;
  }

  private async queryDataSourceById(
    dataSourceId: string,
    pageSize: number,
    startCursor: string | undefined,
    envName: string
  ): Promise<NotionDataSourceQueryResponse> {
    if (!dataSourceId.trim()) {
      throw new AppError("VALIDATION_ERROR", `${envName} is not configured`);
    }

    const payload: Record<string, unknown> = {
      page_size: pageSize,
    };

    if (startCursor) {
      payload.start_cursor = startCursor;
    }

    return this.request<NotionDataSourceQueryResponse>(
      `/data_sources/${encodeURIComponent(dataSourceId)}/query`,
      {
        method: "POST",
        body: payload,
      }
    );
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
