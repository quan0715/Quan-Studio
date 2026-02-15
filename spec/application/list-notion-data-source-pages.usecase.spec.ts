import { describe, expect, it } from "vitest";
import { ListNotionDataSourcePagesUseCase } from "@/application/use-cases/list-notion-data-source-pages.usecase";
import { integrationConfigKeys, type IntegrationConfig, type IntegrationConfigKey } from "@/domain/integration-config/integration-config";
import type { IntegrationConfigRepository } from "@/domain/integration-config/integration-config-repository";
import type { Post } from "@/domain/post/post";
import type { PostRepository } from "@/domain/post/post-repository";
import type { NotionClient } from "@/infrastructure/notion/notion-client";

class InMemoryIntegrationConfigRepository implements IntegrationConfigRepository {
  private readonly map = new Map<IntegrationConfigKey, IntegrationConfig>();

  async findByKey(key: IntegrationConfigKey): Promise<IntegrationConfig | null> {
    return this.map.get(key) ?? null;
  }

  async findByKeys(keys: IntegrationConfigKey[]): Promise<IntegrationConfig[]> {
    return keys
      .map((key) => this.map.get(key))
      .filter((value): value is IntegrationConfig => value !== undefined);
  }

  async upsert(key: IntegrationConfigKey, value: string): Promise<IntegrationConfig> {
    const now = new Date();
    const existing = this.map.get(key);
    const next: IntegrationConfig = {
      id: existing?.id ?? `${key}-id`,
      key,
      value,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.map.set(key, next);
    return next;
  }
}

class StubPostRepository implements PostRepository {
  constructor(private readonly posts: Post[]) {}

  async upsertByNotionPageId(post: Post): Promise<Post> {
    return post;
  }

  async findByNotionPageId(notionPageId: string): Promise<Post | null> {
    void notionPageId;
    return null;
  }

  async findBySlug(slug: string): Promise<Post | null> {
    void slug;
    return null;
  }

  async listAll(): Promise<Post[]> {
    return this.posts;
  }

  async listPublished(): Promise<Post[]> {
    return this.posts.filter((item) => item.status === "published");
  }
}

describe("ListNotionDataSourcePagesUseCase", () => {
  it("reads created_time and last_edited_time from notion page", async () => {
    const configRepository = new InMemoryIntegrationConfigRepository();
    await configRepository.upsert(integrationConfigKeys.notionBlogDataSourceId, "ds-blog");

    const notionClient = {
      queryDataSourceWithId: async () => ({
        object: "list" as const,
        results: [
          {
            object: "page",
            id: "page-1",
            url: "https://notion.so/page-1",
            created_time: "2026-01-01T10:00:00.000Z",
            last_edited_time: "2026-01-02T11:00:00.000Z",
            properties: {
              Name: {
                title: [{ plain_text: "Hello" }],
              },
            },
          },
        ],
        has_more: false,
        next_cursor: null,
      }),
    } as unknown as NotionClient;

    const useCase = new ListNotionDataSourcePagesUseCase(
      notionClient,
      configRepository,
      new StubPostRepository([])
    );

    const result = await useCase.execute(10);

    expect(result).toHaveLength(1);
    expect(result[0]?.createdTime).toBe("2026-01-01T10:00:00.000Z");
    expect(result[0]?.lastEditedTime).toBe("2026-01-02T11:00:00.000Z");
  });

  it("keeps createdTime null when created_time is absent", async () => {
    const configRepository = new InMemoryIntegrationConfigRepository();
    await configRepository.upsert(integrationConfigKeys.notionBlogDataSourceId, "ds-blog");

    const notionClient = {
      queryDataSourceWithId: async () => ({
        object: "list" as const,
        results: [
          {
            object: "page",
            id: "page-1",
            url: "https://notion.so/page-1",
            created_time: "",
            last_edited_time: "2026-01-02T11:00:00.000Z",
            properties: {
              Name: {
                title: [{ plain_text: "Hello" }],
              },
            },
          },
        ],
        has_more: false,
        next_cursor: null,
      }),
    } as unknown as NotionClient;

    const useCase = new ListNotionDataSourcePagesUseCase(
      notionClient,
      configRepository,
      new StubPostRepository([])
    );

    const result = await useCase.execute(10);

    expect(result).toHaveLength(1);
    expect(result[0]?.createdTime).toBeNull();
  });
});
