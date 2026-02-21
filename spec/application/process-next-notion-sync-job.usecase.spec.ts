import { describe, expect, it, vi } from "vitest";
import { ProcessNextNotionSyncJobUseCase } from "@/application/use-cases/process-next-notion-sync-job.usecase";
import { BlogSyncHandler } from "@/application/sync-handlers/blog-sync-handler";
import { integrationConfigKeys, type IntegrationConfigKey } from "@/domain/integration-config/integration-config";
import type { IntegrationConfig } from "@/domain/integration-config/integration-config";
import type { IntegrationConfigRepository } from "@/domain/integration-config/integration-config-repository";
import type { NotionSyncJobRepository } from "@/domain/notion-sync/notion-sync-job-repository";
import type { NotionModelDefinitionRepository } from "@/domain/notion-model-definition/notion-model-definition-repository";
import type { Post } from "@/domain/post/post";
import type { PostRepository } from "@/domain/post/post-repository";
import type { NotionClient } from "@/infrastructure/notion/notion-client";

class InMemoryIntegrationConfigRepository implements IntegrationConfigRepository {
  private readonly map = new Map<string, IntegrationConfig>();

  async findByKey(key: IntegrationConfigKey): Promise<IntegrationConfig | null> {
    return this.map.get(key) ?? null;
  }

  async findByKeys(keys: IntegrationConfigKey[]): Promise<IntegrationConfig[]> {
    return keys
      .map((key) => this.map.get(key as string))
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

describe("ProcessNextNotionSyncJobUseCase", () => {
  it("uses stored schema field mapping when mapping notion page into post", async () => {
    const integrationConfigRepository = new InMemoryIntegrationConfigRepository();
    await integrationConfigRepository.upsert(
      integrationConfigKeys.notionSchemaFieldMapping,
      JSON.stringify({
        version: 1,
        sources: {
          blog: {
            "post.title": "Article Name",
            "post.slug": "Permalink",
            "post.status": "Publish State",
            "post.excerpt": "Short Description",
          },
        },
      })
    );

    const upsertByNotionPageId = vi.fn(async (post: Post) => post);
    const postRepository: PostRepository = {
      upsertByNotionPageId,
      findByNotionPageId: vi.fn(async () => null),
      findBySlug: vi.fn(async () => null),
      listAll: vi.fn(async () => []),
      listPublished: vi.fn(async () => []),
    };

    const notionClient = {
      retrievePage: vi.fn(async () => ({
        id: "page-1",
        created_time: "2026-01-01T00:00:00.000Z",
        last_edited_time: "2026-01-02T00:00:00.000Z",
        properties: {
          Name: {
            type: "title",
            title: [{ plain_text: "Default Title" }],
          },
          "Article Name": {
            type: "title",
            title: [{ plain_text: "Mapped Title" }],
          },
          Permalink: {
            type: "rich_text",
            rich_text: [{ plain_text: "mapped-slug" }],
          },
          "Publish State": {
            type: "select",
            select: { name: "published" },
          },
          "Short Description": {
            type: "rich_text",
            rich_text: [{ plain_text: "mapped excerpt" }],
          },
          Tags: {
            type: "multi_select",
            multi_select: [{ name: "ts" }],
          },
          "Sync Status": {
            type: "status",
            status: { name: "Success" },
          },
        },
      })),
      retrieveAllBlockChildren: vi.fn(async () => ({
        object: "list",
        results: [],
        has_more: false,
        next_cursor: null,
      })),
      updatePageSyncStatus: vi.fn(async () => undefined),
    } as unknown as NotionClient;

    const syncJobRepository = {
      enqueue: vi.fn(),
      claimNext: vi.fn(),
      markStatus: vi.fn(),
      findById: vi.fn(),
      listRecent: vi.fn(),
    } as unknown as NotionSyncJobRepository;

    const blogSyncHandler = new BlogSyncHandler(
      postRepository,
      notionClient,
      integrationConfigRepository,
      createModelRepo("ds-blog")
    );

    const useCase = new ProcessNextNotionSyncJobUseCase(
      syncJobRepository,
      notionClient,
      [blogSyncHandler]
    );

    const result = await useCase.executePage("page-1");

    expect(result).toMatchObject({ ok: true, pageId: "page-1" });
    expect(upsertByNotionPageId).toHaveBeenCalledTimes(1);
    const savedPost = upsertByNotionPageId.mock.calls[0]?.[0] as Post;

    expect(savedPost.title).toBe("Mapped Title");
    expect(savedPost.slug).toBe("mapped-slug");
    expect(savedPost.status).toBe("published");
    expect(savedPost.excerpt).toBe("mapped excerpt");
  });
});

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
                fieldKey: "excerpt",
                appField: "post.excerpt",
                expectedType: "rich_text",
                required: false,
                description: "",
                defaultNotionField: "Excerpt",
                builtinField: null,
                sortOrder: 3,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              {
                id: "f5",
                modelDefinitionId: "m1",
                fieldKey: "tags",
                appField: "post.tags",
                expectedType: "multi_select",
                required: false,
                description: "",
                defaultNotionField: "Tags",
                builtinField: null,
                sortOrder: 4,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              {
                id: "f6",
                modelDefinitionId: "m1",
                fieldKey: "icon",
                appField: "post.icon",
                expectedType: "builtin",
                required: false,
                description: "",
                defaultNotionField: null,
                builtinField: "page.icon",
                sortOrder: 5,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              {
                id: "f7",
                modelDefinitionId: "m1",
                fieldKey: "cover",
                appField: "post.cover",
                expectedType: "builtin",
                required: false,
                description: "",
                defaultNotionField: null,
                builtinField: "page.cover",
                sortOrder: 6,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              {
                id: "f8",
                modelDefinitionId: "m1",
                fieldKey: "createdTime",
                appField: "post.createdTime",
                expectedType: "builtin",
                required: false,
                description: "",
                defaultNotionField: null,
                builtinField: "page.created_time",
                sortOrder: 7,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              {
                id: "f9",
                modelDefinitionId: "m1",
                fieldKey: "lastEditedTime",
                appField: "post.lastEditedTime",
                expectedType: "builtin",
                required: false,
                description: "",
                defaultNotionField: null,
                builtinField: "page.last_edited_time",
                sortOrder: 8,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
          })
        : null,
  };
}
