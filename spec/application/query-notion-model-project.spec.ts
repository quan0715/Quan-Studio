import { describe, expect, it, vi } from "vitest";
import { QueryNotionModelUseCase } from "@/application/use-cases/query-notion-model.usecase";
import { registerProjectionBuilder } from "@/application/services/projection-builder-registry";
import { BuildFlatListViewService } from "@/application/services/build-flat-list-view.service";
import type { IntegrationConfigRepository } from "@/domain/integration-config/integration-config-repository";
import type { QueryNotionModelDataService } from "@/application/services/query-notion-model-data.service";
import { integrationConfigKeys } from "@/domain/integration-config/integration-config";

registerProjectionBuilder("flat_list", new BuildFlatListViewService());

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

describe("QueryNotionModelUseCase with project", () => {
  it("queries project model and returns projected flat list", async () => {
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
        if (key === integrationConfigKeys.notionProjectDataSourceId) {
          return Promise.resolve({ value: "ds-project-123" });
        }
        if (key === integrationConfigKeys.notionSchemaFieldMapping) {
          return Promise.resolve(null);
        }
        return Promise.resolve(null);
      }),
      upsert: vi.fn(),
    };

    const useCase = new QueryNotionModelUseCase(mockQueryService, mockConfigRepo);
    const result = await useCase.execute("project", 100);

    expect(result.meta.modelId).toBe("project");
    expect(result.meta.dataSourceId).toBe("ds-project-123");
    expect(result.meta.projected).toBe(true);
    expect(result.rows).toHaveLength(2);

    const items = result.projected as Array<Record<string, unknown>>;
    expect(items).toHaveLength(2);
    // sorted by name asc
    expect(items[0]).toMatchObject({
      key: "p1",
      name: "Project A",
      description: "Desc A",
      tags: ["React"],
      githubUrl: "https://github.com/a",
      demoUrl: null,
      thumbnail: { emoji: "🎯", url: null },
    });
    expect(items[1]).toMatchObject({
      key: "p2",
      name: "Project B",
      description: null,
      tags: ["Go", "Docker"],
      githubUrl: null,
      demoUrl: "https://demo.example.com",
      thumbnail: null,
    });
  });

  it("throws when project data source is not configured", async () => {
    const mockQueryService = {
      queryPages: vi.fn(),
    } as unknown as QueryNotionModelDataService;

    const mockConfigRepo: IntegrationConfigRepository = {
      findByKey: vi.fn().mockResolvedValue(null),
      upsert: vi.fn(),
    };

    const useCase = new QueryNotionModelUseCase(mockQueryService, mockConfigRepo);

    await expect(useCase.execute("project")).rejects.toThrow(
      "data source for model project is not configured"
    );
  });
});
