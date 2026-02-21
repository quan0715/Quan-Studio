import { describe, expect, it, vi } from "vitest";
import {
  GetNotionSchemaMappingUseCase,
  UpdateNotionSchemaMappingUseCase,
} from "@/application/use-cases/get-notion-schema-mapping.usecase";
import { integrationConfigKeys, type IntegrationConfigKey } from "@/domain/integration-config/integration-config";
import type { IntegrationConfig } from "@/domain/integration-config/integration-config";
import type { IntegrationConfigRepository } from "@/domain/integration-config/integration-config-repository";
import type { NotionClient } from "@/infrastructure/notion/notion-client";
import type { NotionModelDefinitionRepository } from "@/domain/notion-model-definition/notion-model-definition-repository";
import type { NotionModelDefinition } from "@/domain/notion-model-definition/notion-model-definition";

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

function buildDefinitionRepo(dataSourceId: string): NotionModelDefinitionRepository {
  const model: NotionModelDefinition = {
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
        appField: "blog.title",
        expectedType: "title",
        required: true,
        description: "Title",
        defaultNotionField: "Name",
        builtinField: null,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };
  return {
    listAll: async () => [model],
    listActive: async () => [model],
    findByModelKey: async (key: string) => (key === "blog" ? model : null),
    findBySchemaSource: async (source: string) => (source === "blog" ? model : null),
    createDefinition: async () => { throw new Error("no"); },
    updateDefinition: async () => { throw new Error("no"); },
    addField: async () => { throw new Error("no"); },
    updateField: async () => { throw new Error("no"); },
    deleteField: async () => undefined,
    upsertBinding: async () => undefined,
  };
}

describe("GetNotionSchemaMappingUseCase", () => {
  it("builds schema checks from dynamic model definitions", async () => {
    const repository = new InMemoryIntegrationConfigRepository();
    const retrieveDataSource = vi.fn(async () => ({
      id: "ds-blog",
      properties: {
        Name: { type: "title" },
      },
    }));

    const useCase = new GetNotionSchemaMappingUseCase(
      { retrieveDataSource } as unknown as NotionClient,
      repository,
      buildDefinitionRepo("ds-blog")
    );

    const output = await useCase.execute();
    expect(output.reports).toHaveLength(1);
    expect(output.reports[0]?.source).toBe("blog");
    expect(output.reports[0]?.ok).toBe(true);
  });
});

describe("UpdateNotionSchemaMappingUseCase", () => {
  it("validates appField by selected dynamic model fields", async () => {
    const repository = new InMemoryIntegrationConfigRepository();
    const useCase = new UpdateNotionSchemaMappingUseCase(repository, buildDefinitionRepo("ds-blog"));

    await expect(
      useCase.execute({
        source: "blog",
        mappings: {
          "invalid.field": "Name",
        },
      })
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });

    await expect(
      useCase.execute({
        source: "blog",
        mappings: {
          "blog.title": "Name",
        },
      })
    ).resolves.toBeUndefined();

    const stored = await repository.findByKey(integrationConfigKeys.notionSchemaFieldMapping);
    expect(stored).not.toBeNull();
  });
});
