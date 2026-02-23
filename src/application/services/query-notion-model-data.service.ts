import type { NotionClient } from "@/infrastructure/notion/notion-client";

type NotionQueryResponse = {
  object: "list";
  results: Array<Record<string, unknown>>;
  has_more: boolean;
  next_cursor: string | null;
};

export class QueryNotionModelDataService {
  constructor(private readonly notionClient: NotionClient) {}

  async queryPages(input: {
    dataSourceId: string;
    limit: number;
    includeBlocks?: boolean;
  }): Promise<Array<Record<string, unknown>>> {
    const normalizedLimit = Math.min(Math.max(Math.floor(input.limit), 1), 500);
    const pages: Array<Record<string, unknown>> = [];
    let cursor: string | undefined;

    while (pages.length < normalizedLimit) {
      const pageSize = Math.min(100, normalizedLimit - pages.length);
      const response = (await this.notionClient.queryDataSourceWithId(
        input.dataSourceId,
        pageSize,
        cursor
      )) as NotionQueryResponse;
      pages.push(...response.results);

      if (!response.has_more || !response.next_cursor) {
        break;
      }
      cursor = response.next_cursor;
    }

    if (!input.includeBlocks) {
      return pages;
    }

    return Promise.all(
      pages.map(async (page) => {
        const pageId = typeof page.id === "string" ? page.id.trim() : "";
        if (!pageId) {
          return page;
        }
        const children = await this.notionClient.retrieveAllBlockChildren(pageId);
        return {
          ...page,
          __blocks: children.results,
        };
      })
    );
  }
}
