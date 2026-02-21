import { describe, expect, it, vi } from "vitest";
import { QueryNotionModelUseCase } from "@/application/use-cases/query-notion-model.usecase";
import type { IntegrationConfigRepository } from "@/domain/integration-config/integration-config-repository";
import type { QueryNotionModelDataService } from "@/application/services/query-notion-model-data.service";
import { integrationConfigKeys } from "@/domain/integration-config/integration-config";
import type { NotionModelDefinitionRepository } from "@/domain/notion-model-definition/notion-model-definition-repository";

function makeProjectPage(overrides: {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  githubUrl?: string;
  demoUrl?: string;
  icon?: unknown;
}) {
  return {
    object: "page",
    id: overrides.id,
    created_time: "2026-01-01T00:00:00.000Z",
    last_edited_time: "2026-01-02T00:00:00.000Z",
    icon: overrides.icon ?? null,
    properties: {
      Name: { type: "title", title: [{ plain_text: overrides.name }] },
      Description: {
        type: "rich_text",
        rich_text: overrides.description ? [{ plain_text: overrides.description }] : [],
      },
      Tags: {
        type: "multi_select",
        multi_select: (overrides.tags ?? []).map((t) => ({ name: t })),
      },
      GitHub: { type: "url", url: overrides.githubUrl ?? null },
      Demo: { type: "url", url: overrides.demoUrl ?? null },
    },
  };
}

function makeProjectDefinitionRepo(dataSourceId: string | null): NotionModelDefinitionRepository {
  return {
    listAll: vi.fn(),
    listActive: vi.fn(),
    findBySchemaSource: vi.fn(),
    createDefinition: vi.fn(),
    updateDefinition: vi.fn(),
    addField: vi.fn(),
    updateField: vi.fn(),
    deleteField: vi.fn(),
    upsertBinding: vi.fn(),
    findByModelKey: vi.fn(async (modelKey: string) =>
      modelKey === "project"
        ? {
            id: "project-id",
            modelKey: "project",
            label: "Project",
            defaultDisplayName: "Project Model",
            schemaSource: "project",
            projectionKind: "flat_list",
            projectionConfigJson: {
              fields: {
                name: "project.name",
                description: "project.description",
                tags: "project.tags",
                githubUrl: "project.githubUrl",
                demoUrl: "project.demoUrl",
                thumbnail: "project.thumbnail",
              },
              sortBy: [{ field: "name", direction: "asc" }],
            },
            isActive: true,
            dataSourceId,
            createdAt: new Date(),
            updatedAt: new Date(),
            fields: [
              { id: "1", modelDefinitionId: "project-id", fieldKey: "name", appField: "project.name", expectedType: "title", required: true, description: "", defaultNotionField: "Name", builtinField: null, sortOrder: 0, createdAt: new Date(), updatedAt: new Date() },
              { id: "2", modelDefinitionId: "project-id", fieldKey: "description", appField: "project.description", expectedType: "rich_text", required: false, description: "", defaultNotionField: "Description", builtinField: null, sortOrder: 1, createdAt: new Date(), updatedAt: new Date() },
              { id: "3", modelDefinitionId: "project-id", fieldKey: "tags", appField: "project.tags", expectedType: "multi_select", required: false, description: "", defaultNotionField: "Tags", builtinField: null, sortOrder: 2, createdAt: new Date(), updatedAt: new Date() },
              { id: "4", modelDefinitionId: "project-id", fieldKey: "githubUrl", appField: "project.githubUrl", expectedType: "url", required: false, description: "", defaultNotionField: "GitHub", builtinField: null, sortOrder: 3, createdAt: new Date(), updatedAt: new Date() },
              { id: "5", modelDefinitionId: "project-id", fieldKey: "demoUrl", appField: "project.demoUrl", expectedType: "url", required: false, description: "", defaultNotionField: "Demo", builtinField: null, sortOrder: 4, createdAt: new Date(), updatedAt: new Date() },
              { id: "6", modelDefinitionId: "project-id", fieldKey: "thumbnail", appField: "project.thumbnail", expectedType: "builtin", required: false, description: "", defaultNotionField: null, builtinField: "page.icon", sortOrder: 5, createdAt: new Date(), updatedAt: new Date() },
            ],
          }
        : null
    ),
  } as unknown as NotionModelDefinitionRepository;
}

describe("QueryNotionModelUseCase with project", () => {
  it("queries project model and returns typed rows", async () => {
    const mockQueryService = {
      queryPages: vi.fn().mockResolvedValue([
        makeProjectPage({
          id: "p1",
          name: "Project A",
          description: "Desc A",
          tags: ["React"],
          githubUrl: "https://github.com/a",
          icon: { type: "emoji", emoji: "🎯" },
        }),
        makeProjectPage({
          id: "p2",
          name: "Project B",
          tags: ["Go", "Docker"],
          demoUrl: "https://demo.example.com",
        }),
      ]),
    } as unknown as QueryNotionModelDataService;

    const mockConfigRepo: IntegrationConfigRepository = {
      findByKey: vi.fn().mockImplementation((key) => {
        if (key === integrationConfigKeys.notionSchemaFieldMapping) {
          return Promise.resolve(null);
        }
        return Promise.resolve(null);
      }),
      findByKeys: vi.fn().mockResolvedValue([]),
      upsert: vi.fn(),
    };

    const useCase = new QueryNotionModelUseCase(
      mockQueryService,
      mockConfigRepo,
      makeProjectDefinitionRepo("ds-project-123")
    );
    const result = await useCase.execute("project", 100);

    expect(result.meta.modelKey).toBe("project");
    expect(result.meta.dataSourceId).toBe("ds-project-123");
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      __pageId: "p1",
      "project.name": "Project A",
      "project.description": "Desc A",
      "project.tags": ["React"],
      "project.githubUrl": "https://github.com/a",
      "project.demoUrl": null,
      "project.thumbnail": { emoji: "🎯", url: null },
    });
  });
});
