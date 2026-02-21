import { describe, expect, it } from "vitest";
import { ListNotionDataSourcePagesUseCase } from "@/application/use-cases/list-notion-data-source-pages.usecase";
import type { IntegrationConfig, IntegrationConfigKey } from "@/domain/integration-config/integration-config";
import type { IntegrationConfigRepository } from "@/domain/integration-config/integration-config-repository";
import type { NotionModelDefinitionRepository } from "@/domain/notion-model-definition/notion-model-definition-repository";
import type { Post } from "@/domain/post/post";
import type { PostRepository } from "@/domain/post/post-repository";
import type { NotionClient } from "@/infrastructure/notion/notion-client";

function createModelRepo(dataSourceId: string): NotionModelDefinitionRepository {
  return {
    listAll: async () => [],
    listActive: async () => [],
    findBySchemaSource: async () => null,
    createDefinition: async () => {
      throw new Error("not used");
    },
    updateDefinition: async () => {
      throw new Error("not used");
    },
    addField: async () => {
      throw new Error("not used");
    },
    updateField: async () => {
      throw new Error("not used");
    },
    deleteField: async () => undefined,
    upsertBinding: async () => undefined,
    findByModelKey: async (modelKey: string) =>
      modelKey === "blog"
        ? ({
            id: "m1",
            modelKey: "blog",
            label: "Blog",
            defaultDisplayName: "Blog",
            schemaSource: "blog",
            projectionKind: "flat_list",
            projectionConfigJson: {},
            isActive: true,
            dataSourceId,
            createdAt: new Date(),
            updatedAt: new Date(),
            fields: [
              {
                id: "f1",
                modelDefinitionId: "m1",
                fieldKey: "title",
                appField: "post.title",
                expectedType: "title",
                required: true,
                description: "",
                defaultNotionField: "Name",
                builtinField: null,
                sortOrder: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              {
                id: "f2",
                modelDefinitionId: "m1",
                fieldKey: "slug",
                appField: "post.slug",
                expectedType: "rich_text",
                required: false,
                description: "",
                defaultNotionField: "Slug",
                builtinField: null,
                sortOrder: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              {
                id: "f3",
                modelDefinitionId: "m1",
                fieldKey: "status",
                appField: "post.status",
                expectedType: "select",
                required: false,
                description: "",
                defaultNotionField: "Status",
                builtinField: null,
                sortOrder: 2,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              {
                id: "f4",
                modelDefinitionId: "m1",
                fieldKey: "tags",
                appField: "post.tags",
                expectedType: "multi_select",
                required: false,
                description: "",
                defaultNotionField: "Tags",
                builtinField: null,
                sortOrder: 3,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
          })
        : null,
  };
}

class EmptyIntegrationConfigRepository implements IntegrationConfigRepository {
  async findByKey(key: IntegrationConfigKey): Promise<IntegrationConfig | null> {
    void key;
    return null;
  }
  async findByKeys(keys: IntegrationConfigKey[]): Promise<IntegrationConfig[]> {
    void keys;
    return [];
  }
  async upsert(key: IntegrationConfigKey, value: string): Promise<IntegrationConfig> {
    void key;
    void value;
    throw new Error("not used");
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
      createModelRepo("ds-blog"),
      new EmptyIntegrationConfigRepository(),
      new StubPostRepository([])
    );

    const result = await useCase.execute(10);

    expect(result).toHaveLength(1);
    expect(result[0]?.createdTime).toBe("2026-01-01T10:00:00.000Z");
    expect(result[0]?.lastEditedTime).toBe("2026-01-02T11:00:00.000Z");
  });

  it("keeps createdTime null when created_time is absent", async () => {
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
      createModelRepo("ds-blog"),
      new EmptyIntegrationConfigRepository(),
      new StubPostRepository([])
    );

    const result = await useCase.execute(10);

    expect(result).toHaveLength(1);
    expect(result[0]?.createdTime).toBeNull();
  });
});
