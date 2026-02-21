import { describe, expect, it, vi } from "vitest";
import { ProvisionNotionDatabaseUseCase } from "@/application/use-cases/provision-notion-database.usecase";
import type { NotionClient } from "@/infrastructure/notion/notion-client";
import type { NotionModelDefinitionRepository } from "@/domain/notion-model-definition/notion-model-definition-repository";

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
    findByModelKey: async (key: string) =>
      key === "blog"
        ? ({
            id: "model-blog",
            modelKey: "blog",
            label: "Blog",
            defaultDisplayName: "Blog Model",
            schemaSource: "blog",
            projectionKind: "flat_list",
            projectionConfigJson: {},
            isActive: true,
            dataSourceId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            fields: [
              {
                id: "f1",
                modelDefinitionId: "model-blog",
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
    upsertBinding: vi.fn(async () => undefined),
  };
}

describe("ProvisionNotionDatabaseUseCase", () => {
  it("creates database and binds data source", async () => {
    const repository = createRepo();
    const createDatabase = vi.fn(async () => ({
      databaseId: "db-123",
      dataSourceId: "ds-456",
    }));

    const useCase = new ProvisionNotionDatabaseUseCase(
      { createDatabase } as unknown as NotionClient,
      repository,
      "source-page-id"
    );

    const result = await useCase.execute({ modelId: "blog" });

    expect(result).toEqual({
      databaseId: "db-123",
      dataSourceId: "ds-456",
      displayName: "Blog Model",
    });
    expect(createDatabase).toHaveBeenCalledOnce();
    expect(repository.upsertBinding).toHaveBeenCalledWith("blog", "ds-456");
  });
});

