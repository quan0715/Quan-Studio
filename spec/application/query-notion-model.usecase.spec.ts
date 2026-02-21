import { describe, expect, it } from "vitest";
import { QueryNotionModelUseCase } from "@/application/use-cases/query-notion-model.usecase";
import { QueryNotionModelDataService } from "@/application/services/query-notion-model-data.service";
import { integrationConfigKeys, type IntegrationConfig, type IntegrationConfigKey } from "@/domain/integration-config/integration-config";
import type { IntegrationConfigRepository } from "@/domain/integration-config/integration-config-repository";
import type { NotionModelDefinitionRepository } from "@/domain/notion-model-definition/notion-model-definition-repository";
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

function createNotionClientWithPages(
  pages: Array<Record<string, unknown>>
): NotionClient {
  return {
    queryDataSourceWithId: async () => ({
      object: "list",
      results: pages,
      has_more: false,
      next_cursor: null,
    }),
  } as unknown as NotionClient;
}

function createDefinitionRepo(dataSourceId: string | null): NotionModelDefinitionRepository {
  return {
    listAll: async () => [],
    listActive: async () => [],
    findBySchemaSource: async () => null,
    createDefinition: async () => {
      throw new Error("not implemented");
    },
    updateDefinition: async () => {
      throw new Error("not implemented");
    },
    addField: async () => {
      throw new Error("not implemented");
    },
    updateField: async () => {
      throw new Error("not implemented");
    },
    deleteField: async () => undefined,
    upsertBinding: async () => undefined,
    findByModelKey: async (modelKey: string) => {
      if (modelKey !== "resume") {
        return null;
      }
      return {
        id: "model-1",
        modelKey: "resume",
        label: "Resume",
        defaultDisplayName: "Resume Model",
        schemaSource: "resume",
        projectionKind: "flat_list",
        projectionConfigJson: {
          fields: {
            title: "resume.name",
            location: "resume.location",
            tags: "resume.tags",
          },
          sortBy: [{ field: "title", direction: "asc" }],
        },
        isActive: true,
        dataSourceId,
        createdAt: new Date(),
        updatedAt: new Date(),
        fields: [
          {
            id: "f1",
            modelDefinitionId: "model-1",
            fieldKey: "name",
            appField: "resume.name",
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
            modelDefinitionId: "model-1",
            fieldKey: "location",
            appField: "resume.location",
            expectedType: "rich_text",
            required: false,
            description: "",
            defaultNotionField: "Location",
            builtinField: null,
            sortOrder: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "f3",
            modelDefinitionId: "model-1",
            fieldKey: "tags",
            appField: "resume.tags",
            expectedType: "multi_select",
            required: false,
            description: "",
            defaultNotionField: "Tags",
            builtinField: null,
            sortOrder: 2,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };
    },
  };
}

describe("QueryNotionModelUseCase", () => {
  it("returns VALIDATION_ERROR when model data source is not configured", async () => {
    const repository = new InMemoryIntegrationConfigRepository();
    const queryService = new QueryNotionModelDataService(createNotionClientWithPages([]));
    const useCase = new QueryNotionModelUseCase(queryService, repository, createDefinitionRepo(null));

    await expect(useCase.execute("resume", 10)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("queries model and returns typed flat rows", async () => {
    const repository = new InMemoryIntegrationConfigRepository();
    await repository.upsert(
      integrationConfigKeys.notionSchemaFieldMapping,
      JSON.stringify({ version: 1, sources: {} })
    );

    const queryService = new QueryNotionModelDataService(
      createNotionClientWithPages([
        {
          object: "page",
          id: "resume-entry-1",
          created_time: "2026-01-01T00:00:00.000Z",
          last_edited_time: "2026-01-02T00:00:00.000Z",
          properties: {
            Name: { type: "title", title: [{ plain_text: "Default Named Item" }] },
            Location: { type: "rich_text", rich_text: [{ plain_text: "Taichung, Taiwan" }] },
            Tags: { type: "multi_select", multi_select: [{ name: "CS" }] },
          },
        },
      ])
    );

    const useCase = new QueryNotionModelUseCase(queryService, repository, createDefinitionRepo("ds-resume"));
    const output = await useCase.execute("resume", 10);

    expect(output.meta.modelKey).toBe("resume");
    expect(output.meta.dataSourceId).toBe("ds-resume");
    expect(output.rows[0]?.["__pageId"]).toBe("resume-entry-1");
    expect(output.rows[0]?.["resume.name"]).toBe("Default Named Item");
  });
});
