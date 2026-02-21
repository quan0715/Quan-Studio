import { describe, expect, it } from "vitest";
import {
  buildMigrationPayload,
  computeSchemaDiff,
  toNotionPropertyType,
  toNotionPropertySchema,
} from "@/application/services/notion-schema-diff.service";
import type { NotionSchemaFieldExpectation } from "@/domain/notion-models/model-descriptor";
import type { DataSourceProperty } from "@/application/services/notion-model-mapper.service";

function expectation(
  appField: string,
  notionField: string,
  expectedType: string
): NotionSchemaFieldExpectation {
  return { appField, notionField, expectedType, required: false, description: "" };
}

function prop(name: string, type: string): DataSourceProperty {
  return { name, type };
}

describe("computeSchemaDiff", () => {
  it("returns add action for missing fields", () => {
    const actions = computeSchemaDiff({
      expectations: [
        expectation("post.tags", "Tags", "multi_select"),
      ],
      currentProperties: [prop("Name", "title")],
      explicitMappings: {},
    });

    expect(actions).toEqual([
      { kind: "add", fieldName: "Tags", fieldType: "multi_select" },
    ]);
  });

  it("returns rename action when explicit mapping points to different name", () => {
    const actions = computeSchemaDiff({
      expectations: [
        expectation("post.title", "Name", "title"),
        expectation("post.slug", "Slug", "rich_text"),
      ],
      currentProperties: [prop("Name", "title"), prop("Slug", "rich_text")],
      explicitMappings: { "post.slug": "URL Slug" },
    });

    expect(actions).toEqual([
      { kind: "rename", fromName: "Slug", toName: "URL Slug" },
    ]);
  });

  it("returns delete action for unreferenced properties (excluding title)", () => {
    const actions = computeSchemaDiff({
      expectations: [
        expectation("post.title", "Name", "title"),
      ],
      currentProperties: [
        prop("Name", "title"),
        prop("OldField", "rich_text"),
      ],
      explicitMappings: {},
    });

    expect(actions).toEqual([
      { kind: "delete", fieldName: "OldField" },
    ]);
  });

  it("returns no actions when schema matches", () => {
    const actions = computeSchemaDiff({
      expectations: [
        expectation("post.title", "Name", "title"),
        expectation("post.tags", "Tags", "multi_select"),
      ],
      currentProperties: [prop("Name", "title"), prop("Tags", "multi_select")],
      explicitMappings: {},
    });

    expect(actions).toEqual([]);
  });

  it("skips builtin expectations", () => {
    const actions = computeSchemaDiff({
      expectations: [
        expectation("post.title", "Name", "title"),
        { appField: "post.icon", notionField: "page.icon", expectedType: "builtin", required: false, description: "" },
      ],
      currentProperties: [prop("Name", "title")],
      explicitMappings: {},
    });

    expect(actions).toEqual([]);
  });

  it("returns type_change action when field exists but type differs", () => {
    const actions = computeSchemaDiff({
      expectations: [
        expectation("post.title", "Name", "title"),
        expectation("post.tags", "Tags", "multi_select"),
      ],
      currentProperties: [prop("Name", "title"), prop("Tags", "rich_text")],
      explicitMappings: {},
    });

    expect(actions).toEqual([
      { kind: "type_change", fieldName: "Tags", fromType: "rich_text", toType: "multi_select" },
    ]);
  });

  it("treats file expected + files actual as compatible (no action)", () => {
    const actions = computeSchemaDiff({
      expectations: [
        expectation("post.title", "Name", "title"),
        expectation("post.cover", "Cover", "file"),
      ],
      currentProperties: [prop("Name", "title"), prop("Cover", "files")],
      explicitMappings: {},
    });

    expect(actions).toEqual([]);
  });
});

describe("toNotionPropertySchema", () => {
  it("returns schema for known types", () => {
    expect(toNotionPropertySchema("title")).toEqual({ title: {} });
    expect(toNotionPropertySchema("rich_text")).toEqual({ rich_text: {} });
    expect(toNotionPropertySchema("select")).toEqual({ select: {} });
    expect(toNotionPropertySchema("multi_select")).toEqual({ multi_select: {} });
    expect(toNotionPropertySchema("number")).toEqual({ number: {} });
    expect(toNotionPropertySchema("date")).toEqual({ date: {} });
    expect(toNotionPropertySchema("checkbox")).toEqual({ checkbox: {} });
    expect(toNotionPropertySchema("url")).toEqual({ url: {} });
    expect(toNotionPropertySchema("status")).toEqual({ status: {} });
    expect(toNotionPropertySchema("file")).toEqual({ files: {} });
    expect(toNotionPropertySchema("media")).toEqual({ files: {} });
  });

  it("returns null for builtin and unknown types", () => {
    expect(toNotionPropertySchema("builtin")).toBeNull();
    expect(toNotionPropertySchema("formula")).toBeNull();
  });
});

describe("toNotionPropertyType", () => {
  it("maps file/media to files", () => {
    expect(toNotionPropertyType("file")).toBe("files");
    expect(toNotionPropertyType("media")).toBe("files");
    expect(toNotionPropertyType("title")).toBe("title");
    expect(toNotionPropertyType("builtin")).toBeNull();
  });
});

describe("buildMigrationPayload", () => {
  it("builds correct payload for all action kinds", () => {
    const payload = buildMigrationPayload([
      { kind: "add", fieldName: "Tags", fieldType: "multi_select" },
      { kind: "add", fieldName: "Assets", fieldType: "file" },
      { kind: "rename", fromName: "Slug", toName: "URL Slug" },
      { kind: "delete", fieldName: "OldField" },
    ]);

    expect(payload).toEqual({
      Tags: { type: "multi_select", multi_select: {} },
      Assets: { type: "files", files: {} },
      Slug: { name: "URL Slug" },
      OldField: null,
    });
  });

  it("builds correct payload for type_change action", () => {
    const payload = buildMigrationPayload([
      { kind: "type_change", fieldName: "Tags", fromType: "rich_text", toType: "multi_select" },
    ]);

    expect(payload).toEqual({
      Tags: { type: "multi_select", multi_select: {} },
    });
  });
});
