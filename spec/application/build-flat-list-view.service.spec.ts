import { describe, expect, it } from "vitest";
import { BuildFlatListViewService } from "@/application/services/build-flat-list-view.service";
import { projectNotionModel } from "@/domain/notion-models/project.notion";

function getProjectProjectionInput() {
  if (!projectNotionModel.schemaMapping || !projectNotionModel.projection) {
    throw new Error("project notion model is missing schema config");
  }

  return {
    schemaMapping: projectNotionModel.schemaMapping,
    projection: projectNotionModel.projection,
  };
}

function makePage(overrides: {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  githubUrl?: string;
  demoUrl?: string;
  icon?: unknown;
  object?: string;
}) {
  return {
    object: overrides.object ?? "page",
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

describe("BuildFlatListViewService", () => {
  it("maps pages to flat list items with correct field names", () => {
    const service = new BuildFlatListViewService();
    const { schemaMapping, projection } = getProjectProjectionInput();

    const items = service.build({
      schemaMapping,
      projection,
      explicitMappings: {},
      pages: [
        makePage({
          id: "p1",
          name: "My App",
          description: "A cool app",
          tags: ["React", "TypeScript"],
          githubUrl: "https://github.com/example/app",
          demoUrl: "https://example.com",
          icon: { type: "emoji", emoji: "🚀" },
        }),
      ],
    }) as Array<Record<string, unknown>>;

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      key: "p1",
      name: "My App",
      description: "A cool app",
      tags: ["React", "TypeScript"],
      githubUrl: "https://github.com/example/app",
      demoUrl: "https://example.com",
      thumbnail: { emoji: "🚀", url: null },
    });
  });

  it("filters out non-page objects", () => {
    const service = new BuildFlatListViewService();
    const { schemaMapping, projection } = getProjectProjectionInput();

    const items = service.build({
      schemaMapping,
      projection,
      explicitMappings: {},
      pages: [
        makePage({ id: "p1", name: "Valid", object: "page" }),
        makePage({ id: "db1", name: "Database", object: "database" }),
      ],
    }) as Array<Record<string, unknown>>;

    expect(items).toHaveLength(1);
    expect(items[0]?.key).toBe("p1");
  });

  it("sorts items by name ascending", () => {
    const service = new BuildFlatListViewService();
    const { schemaMapping, projection } = getProjectProjectionInput();

    const items = service.build({
      schemaMapping,
      projection,
      explicitMappings: {},
      pages: [
        makePage({ id: "p2", name: "Zebra" }),
        makePage({ id: "p1", name: "Alpha" }),
        makePage({ id: "p3", name: "Middle" }),
      ],
    }) as Array<Record<string, unknown>>;

    expect(items.map((i) => i.name)).toEqual(["Alpha", "Middle", "Zebra"]);
  });

  it("supports explicit field mappings", () => {
    const service = new BuildFlatListViewService();
    const { schemaMapping, projection } = getProjectProjectionInput();

    const items = service.build({
      schemaMapping,
      projection,
      explicitMappings: {
        "project.name": "Project Name",
      },
      pages: [
        {
          object: "page",
          id: "p1",
          created_time: "2026-01-01T00:00:00.000Z",
          last_edited_time: "2026-01-02T00:00:00.000Z",
          icon: null,
          properties: {
            "Project Name": { type: "title", title: [{ plain_text: "Custom Field" }] },
            Description: { type: "rich_text", rich_text: [] },
            Tags: { type: "multi_select", multi_select: [] },
            GitHub: { type: "url", url: null },
            Demo: { type: "url", url: null },
          },
        },
      ],
    }) as Array<Record<string, unknown>>;

    expect(items).toHaveLength(1);
    expect(items[0]?.name).toBe("Custom Field");
  });

  it("returns null fields for missing optional properties", () => {
    const service = new BuildFlatListViewService();
    const { schemaMapping, projection } = getProjectProjectionInput();

    const items = service.build({
      schemaMapping,
      projection,
      explicitMappings: {},
      pages: [makePage({ id: "p1", name: "Minimal" })],
    }) as Array<Record<string, unknown>>;

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      key: "p1",
      name: "Minimal",
      description: null,
      tags: [],
      githubUrl: null,
      demoUrl: null,
      thumbnail: null,
    });
  });
});
