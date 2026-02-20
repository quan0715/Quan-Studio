import { AppError } from "@/application/errors";
import { env } from "@/infrastructure/config/env";
import { isPlainObject } from "@/shared/utils/type-guards";

type NotionPageResponse = {
  id: string;
  created_time: string;
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

type NotionDataSourceResponse = {
  id: string;
  properties?: Record<string, unknown>;
};

type NotionDatabaseResponse = {
  id: string;
  url?: string;
  data_sources?: Array<{
    id: string;
    name?: string;
  }>;
};

export type NotionSyncStatusLabel = "IDLE" | "Processing" | "Success" | "Failed";

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

  async retrieveDataSource(dataSourceId: string): Promise<NotionDataSourceResponse> {
    if (!dataSourceId.trim()) {
      throw new AppError("VALIDATION_ERROR", "data source id is not configured");
    }

    return this.request<NotionDataSourceResponse>(`/data_sources/${encodeURIComponent(dataSourceId)}`);
  }

  async updatePageProperties(pageId: string, properties: Record<string, unknown>): Promise<void> {
    await this.request(`/pages/${encodeURIComponent(pageId)}`, {
      method: "PATCH",
      body: { properties },
    });
  }

  async updatePageSyncStatus(pageId: string, status: NotionSyncStatusLabel): Promise<void> {
    try {
      await this.updatePageProperties(pageId, {
        "Sync Status": {
          status: {
            name: status,
          },
        },
      });
    } catch (error) {
      if (isNotionBadRequestError(error)) {
        throw new AppError(
          "NOTION_API_ERROR",
          [
            "Sync Status update failed. Please configure Notion DB property exactly as:",
            '1) Property name: "Sync Status"',
            "2) Property type: Status",
            '3) Status options include: "IDLE", "Processing", "Success", "Failed"',
          ].join(" ")
        );
      }
      throw error;
    }
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
      const errorText = await safeReadResponseText(response);
      const suffix = errorText ? `: ${errorText}` : "";
      throw new AppError("NOTION_API_ERROR", `notion request failed with status ${response.status}${suffix}`);
    }

    if (response.status === 204) {
      return undefined as T;
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

async function safeReadResponseText(response: Response): Promise<string> {
  try {
    return (await response.text()).trim();
  } catch {
    return "";
  }
}

function isNotionBadRequestError(error: unknown): boolean {
  if (!(error instanceof AppError)) {
    return false;
  }

  return error.code === "NOTION_API_ERROR" && error.message.includes("status 400");
}
