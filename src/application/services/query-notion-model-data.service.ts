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

    return pages;
  }
}
