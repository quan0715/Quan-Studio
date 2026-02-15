import { describe, expect, it } from "vitest";
import { blogNotionModel } from "@/domain/notion-models/blog.notion";
import {
  NotionModelMapperService,
  parseStoredNotionSchemaFieldMapping,
  toDataSourceProperties,
} from "@/application/services/notion-model-mapper.service";

describe("NotionModelMapperService", () => {
  it("evaluates schema checks with explicit mapping from descriptor", () => {
    const mapper = new NotionModelMapperService();
    const schema = blogNotionModel.schemaMapping;
    if (!schema) {
      throw new Error("blog schema mapping missing");
    }

    const properties = toDataSourceProperties({
      "Article Name": { type: "title" },
      Slug: { type: "rich_text" },
      Status: { type: "select" },
      Excerpt: { type: "rich_text" },
      Tags: { type: "multi_select" },
      "Sync Status": { type: "status" },
    });

    const result = mapper.evaluateSchema({
      expectations: schema.expectations,
      builtinChecks: schema.builtinChecks ?? [],
      properties,
      explicitMappings: {
        "post.title": "Article Name",
      },
    });

    const titleCheck = result.checks.find((item) => item.appField === "post.title");
    expect(titleCheck).toMatchObject({
      mappedExplicitly: true,
      selectedNotionField: "Article Name",
      matchedName: "Article Name",
      status: "ok",
    });
    expect(result.ok).toBe(true);
  });

  it("maps page fields using explicit mapping and built-in fields", () => {
    const mapper = new NotionModelMapperService();
    const schema = blogNotionModel.schemaMapping;
    if (!schema) {
      throw new Error("blog schema mapping missing");
    }

    const mapped = mapper.mapPageFields({
      expectations: schema.expectations,
      builtinChecks: schema.builtinChecks,
      explicitMappings: {
        "post.title": "Article Name",
      },
      page: {
        created_time: "2026-01-01T00:00:00.000Z",
        last_edited_time: "2026-01-02T00:00:00.000Z",
        icon: { type: "emoji", emoji: "🔥" },
        cover: {
          type: "external",
          external: { url: "https://example.com/cover.png" },
        },
        properties: {
          "Article Name": {
            type: "title",
            title: [{ plain_text: "Mapped Title" }],
          },
          Slug: {
            type: "rich_text",
            rich_text: [{ plain_text: "mapped-title" }],
          },
          Status: {
            type: "select",
            select: { name: "published" },
          },
          Excerpt: {
            type: "rich_text",
            rich_text: [{ plain_text: "Summary" }],
          },
          Tags: {
            type: "multi_select",
            multi_select: [{ name: "a" }, { name: "b" }],
          },
          "Sync Status": {
            type: "status",
            status: { name: "Success" },
          },
        },
      },
    });

    expect(mapped["post.title"]).toBe("Mapped Title");
    expect(mapped["post.slug"]).toBe("mapped-title");
    expect(mapped["post.status"]).toBe("published");
    expect(mapped["post.excerpt"]).toBe("Summary");
    expect(mapped["post.tags"]).toEqual(["a", "b"]);
    expect(mapped["post.cover"]).toBe("https://example.com/cover.png");
    expect(mapped["post.icon"]).toEqual({ emoji: "🔥", url: null });
    expect(mapped["post.createdTime"]).toBe("2026-01-01T00:00:00.000Z");
    expect(mapped["post.lastEditedTime"]).toBe("2026-01-02T00:00:00.000Z");
  });
});

describe("parseStoredNotionSchemaFieldMapping", () => {
  it("normalizes and filters invalid values", () => {
    const parsed = parseStoredNotionSchemaFieldMapping(
      JSON.stringify({
        version: 1,
        sources: {
          blog: {
            "post.title": "  Article Name  ",
            "post.slug": "",
          },
          "   ": {
            bad: "x",
          },
        },
      })
    );

    expect(parsed).toMatchObject({
      version: 1,
      sources: {
        blog: {
          "post.title": "Article Name",
        },
      },
    });
  });
});

