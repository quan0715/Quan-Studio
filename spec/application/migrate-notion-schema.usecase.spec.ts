import { describe, expect, it, vi } from "vitest";
import { MigrateNotionSchemaUseCase } from "@/application/use-cases/migrate-notion-schema.usecase";
import { integrationConfigKeys, type IntegrationConfig, type IntegrationConfigKey } from "@/domain/integration-config/integration-config";
import type { IntegrationConfigRepository } from "@/domain/integration-config/integration-config-repository";
import type { NotionClient } from "@/infrastructure/notion/notion-client";
import type { NotionModelDefinitionRepository } from "@/domain/notion-model-definition/notion-model-definition-repository";

class InMemoryIntegrationConfigRepository implements IntegrationConfigRepository {
  private readonly map = new Map<IntegrationConfigKey, IntegrationConfig>();
  async findByKey(key: IntegrationConfigKey): Promise<IntegrationConfig | null> {
    return this.map.get(key) ?? null;
  }
  async findByKeys(keys: IntegrationConfigKey[]): Promise<IntegrationConfig[]> {
    return keys.map((key) => this.map.get(key)).filter((v): v is IntegrationConfig => Boolean(v));
  }
  async upsert(key: IntegrationConfigKey, value: string): Promise<IntegrationConfig> {
    const now = new Date();
    const row: IntegrationConfig = {
      id: `${key}-id`,
      key,
      value,
      createdAt: now,
      updatedAt: now,
    };
    this.map.set(key, row);
    return row;
  }
}

function createRepo(): NotionModelDefinitionRepository {
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
            dataSourceId: "ds-blog",
            createdAt: new Date(),
            updatedAt: new Date(),
            fields: [
              {
                id: "f1",
                modelDefinitionId: "m1",
                fieldKey: "title",
                appField: "blog.title",
                expectedType: "title",
                required: true,
                description: "",
                defaultNotionField: "Name",
                builtinField: null,
                sortOrder: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
          })
        : null,
  };
}

describe("MigrateNotionSchemaUseCase", () => {
  it("detects missing fields and applies add actions", async () => {
    const repository = new InMemoryIntegrationConfigRepository();
    await repository.upsert(integrationConfigKeys.notionSchemaFieldMapping, JSON.stringify({ version: 1, sources: {} }));

    const retrieveDataSource = vi.fn(async () => ({
      id: "ds-blog",
      properties: {},
    }));
    const updateDataSourceProperties = vi.fn(async () => undefined);
    const useCase = new MigrateNotionSchemaUseCase(
      { retrieveDataSource, updateDataSourceProperties } as unknown as NotionClient,
      repository,
      createRepo()
    );

    const result = await useCase.execute({ modelId: "blog" });
    expect(result.dataSourceId).toBe("ds-blog");
    expect(result.applied.some((a) => a.kind === "add")).toBe(true);
  });
});

