import { describe, expect, it, vi } from "vitest";
import { AppError } from "@/application/errors";
import {
  ListNotionSourcePageDataSourcesService,
  type SourcePageDataSourceCandidate,
} from "@/application/services/list-notion-source-page-data-sources.service";
import type { NotionClient } from "@/infrastructure/notion/notion-client";

type MockNotionClient = Pick<NotionClient, "retrieveAllBlockChildren" | "retrieveDatabase">;

function createService(client: MockNotionClient) {
  return new ListNotionSourcePageDataSourcesService(client as NotionClient);
}

describe("ListNotionSourcePageDataSourcesService", () => {
  it("throws VALIDATION_ERROR when source page id is missing", async () => {
    const service = createService({
      retrieveAllBlockChildren: vi.fn(),
      retrieveDatabase: vi.fn(),
    });

    await expect(service.execute("   ")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    } satisfies Partial<AppError>);
  });

  it("returns empty list when no child databases exist", async () => {
    const retrieveAllBlockChildren = vi.fn().mockResolvedValue({
      object: "list",
      results: [
        {
          id: "block-1",
          type: "paragraph",
          paragraph: {},
        },
      ],
      has_more: false,
      next_cursor: null,
    });
    const retrieveDatabase = vi.fn();
    const service = createService({
      retrieveAllBlockChildren,
      retrieveDatabase,
    });

    const result = await service.execute("source-page-id");

    expect(result).toEqual<SourcePageDataSourceCandidate[]>([]);
    expect(retrieveDatabase).not.toHaveBeenCalled();
  });

  it("collects child databases, dedupes by data source id, and sorts by title", async () => {
    const retrieveAllBlockChildren = vi.fn().mockResolvedValue({
      object: "list",
      results: [
        {
          id: "db-b",
          type: "child_database",
          child_database: {
            title: "Database B",
            children: [
              {
                id: "db-a",
                type: "child_database",
                child_database: { title: "Database A" },
              },
            ],
          },
        },
        {
          id: "db-c",
          type: "child_database",
          child_database: { title: "Database C" },
        },
        {
          id: "db-b",
          type: "child_database",
          child_database: { title: "Database B Duplicate" },
        },
      ],
      has_more: false,
      next_cursor: null,
    });

    const retrieveDatabase = vi
      .fn()
      .mockImplementation(async (databaseId: string) => {
        if (databaseId === "db-a") {
          return {
            id: "db-a",
            url: "https://notion.so/db-a",
            data_sources: [{ id: "ds-a" }],
            title: [{ plain_text: "Alpha DB" }],
          };
        }
        if (databaseId === "db-b") {
          return {
            id: "db-b",
            url: "https://notion.so/db-b",
            data_sources: [{ id: "ds-b" }],
            title: [{ plain_text: "Beta DB" }],
          };
        }
        return {
          id: "db-c",
          url: "https://notion.so/db-c",
          data_sources: [{ id: "ds-b" }],
          title: [{ plain_text: "Gamma DB Duplicate DataSource" }],
        };
      });

    const service = createService({
      retrieveAllBlockChildren,
      retrieveDatabase,
    });

    const result = await service.execute("source-page-id");

    expect(result).toEqual([
      {
        databaseId: "db-a",
        databaseTitle: "Alpha DB",
        dataSourceId: "ds-a",
        url: "https://notion.so/db-a",
      },
      {
        databaseId: "db-b",
        databaseTitle: "Beta DB",
        dataSourceId: "ds-b",
        url: "https://notion.so/db-b",
      },
    ]);
  });
});
