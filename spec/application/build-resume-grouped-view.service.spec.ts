import { describe, expect, it } from "vitest";
import { BuildResumeGroupedViewService } from "@/application/services/build-resume-grouped-view.service";
import { resumeNotionModel } from "@/domain/notion-models/resume.notion";

function getResumeProjectionInput() {
  if (!resumeNotionModel.schemaMapping || !resumeNotionModel.projection) {
    throw new Error("resume notion model is missing schema config");
  }

  return {
    schemaMapping: resumeNotionModel.schemaMapping,
    projection: resumeNotionModel.projection,
  };
}

describe("BuildResumeGroupedViewService", () => {
  it("applies explicit mapping, filters private entries and sorts sections/groups/items", () => {
    const service = new BuildResumeGroupedViewService();
    const { schemaMapping, projection } = getResumeProjectionInput();

    const sections = service.build({
      schemaMapping,
      projection,
      explicitMappings: {
        "resume.name": "Entry Name",
        "resume.section": "Entry Section",
        "resume.group": "Entry Group",
        "resume.location": "Entry Location",
        "resume.summary": "Entry Summary",
        "resume.date": "Entry Date",
        "resume.tags": "Entry Tags",
        "resume.sectionOrder": "Entry Section Order",
        "resume.groupOrder": "Entry Group Order",
        "resume.itemOrder": "Entry Item Order",
        "resume.visibility": "Entry Visibility",
      },
      pages: [
        {
          object: "page",
          id: "entry-1",
          created_time: "2026-01-01T00:00:00.000Z",
          last_edited_time: "2026-01-02T00:00:00.000Z",
          icon: {
            type: "external",
            external: {
              url: "https://example.com/logo-1.png",
            },
          },
          properties: {
            "Entry Name": { type: "title", title: [{ plain_text: "Platform Engineer" }] },
            "Entry Section": { type: "select", select: { name: "Work Experience" } },
            "Entry Group": { type: "rich_text", rich_text: [{ plain_text: "Acme" }] },
            "Entry Location": { type: "rich_text", rich_text: [{ plain_text: "Taipei, Taiwan" }] },
            "Entry Summary": {
              type: "rich_text",
              rich_text: [{ plain_text: "Built systems\n- Scaled API" }],
            },
            "Entry Date": { type: "date", date: { start: "2024-01-01", end: null } },
            "Entry Tags": { type: "multi_select", multi_select: [{ name: "Go" }, { name: "Cloud" }] },
            "Entry Section Order": { type: "number", number: 20 },
            "Entry Group Order": { type: "number", number: 1 },
            "Entry Item Order": { type: "number", number: 2 },
            "Entry Visibility": { type: "select", select: { name: "public" } },
          },
        },
        {
          object: "page",
          id: "entry-2",
          created_time: "2026-01-01T00:00:00.000Z",
          last_edited_time: "2026-01-02T00:00:00.000Z",
          icon: {
            type: "external",
            external: {
              url: "https://example.com/logo-2.png",
            },
          },
          properties: {
            "Entry Name": { type: "title", title: [{ plain_text: "Senior Engineer" }] },
            "Entry Section": { type: "select", select: { name: "Work Experience" } },
            "Entry Group": { type: "rich_text", rich_text: [{ plain_text: "Acme" }] },
            "Entry Location": { type: "rich_text", rich_text: [{ plain_text: "Remote" }] },
            "Entry Summary": {
              type: "rich_text",
              rich_text: [{ plain_text: "Led migration" }],
            },
            "Entry Date": { type: "date", date: { start: "2025-01-01", end: null } },
            "Entry Tags": { type: "multi_select", multi_select: [{ name: "Cloud" }] },
            "Entry Section Order": { type: "number", number: 20 },
            "Entry Group Order": { type: "number", number: 1 },
            "Entry Item Order": { type: "number", number: 1 },
            "Entry Visibility": { type: "select", select: { name: "public" } },
          },
        },
        {
          object: "page",
          id: "entry-hidden",
          created_time: "2026-01-01T00:00:00.000Z",
          last_edited_time: "2026-01-02T00:00:00.000Z",
          icon: { type: "emoji", emoji: "🙈" },
          properties: {
            "Entry Name": { type: "title", title: [{ plain_text: "Hidden Entry" }] },
            "Entry Section": { type: "select", select: { name: "Work Experience" } },
            "Entry Group": { type: "rich_text", rich_text: [{ plain_text: "Acme" }] },
            "Entry Location": { type: "rich_text", rich_text: [{ plain_text: "Secret Base" }] },
            "Entry Summary": { type: "rich_text", rich_text: [{ plain_text: "Should hide" }] },
            "Entry Date": { type: "date", date: { start: "2023-01-01", end: null } },
            "Entry Tags": { type: "multi_select", multi_select: [{ name: "Secret" }] },
            "Entry Section Order": { type: "number", number: 20 },
            "Entry Group Order": { type: "number", number: 1 },
            "Entry Item Order": { type: "number", number: 99 },
            "Entry Visibility": { type: "select", select: { name: "private" } },
          },
        },
        {
          object: "page",
          id: "entry-edu",
          created_time: "2026-01-01T00:00:00.000Z",
          last_edited_time: "2026-01-02T00:00:00.000Z",
          icon: {
            type: "file",
            file: {
              url: "https://example.com/logo-edu.png",
            },
          },
          properties: {
            "Entry Name": { type: "title", title: [{ plain_text: "Computer Science" }] },
            "Entry Section": { type: "select", select: { name: "Education" } },
            "Entry Group": { type: "rich_text", rich_text: [{ plain_text: "University" }] },
            "Entry Location": { type: "rich_text", rich_text: [{ plain_text: "Tainan, Taiwan" }] },
            "Entry Summary": { type: "rich_text", rich_text: [{ plain_text: "Bachelor degree" }] },
            "Entry Date": { type: "date", date: { start: "2020-09-01", end: "2024-06-30" } },
            "Entry Tags": { type: "multi_select", multi_select: [{ name: "CS" }] },
            "Entry Visibility": { type: "select", select: { name: "public" } },
          },
        },
      ],
    });

    expect(sections).toHaveLength(2);
    expect(sections[0]).toMatchObject({
      key: "work-experience",
      title: "Work Experience",
      order: 20,
    });
    expect(sections[0]?.groups[0]?.entries.map((entry) => entry.title)).toEqual([
      "Senior Engineer",
      "Platform Engineer",
    ]);
    expect(sections[0]?.groups[0]?.entries[1]).toMatchObject({
      period: {
        label: "Jan 2024 - Present",
        start: "2024-01-01",
      },
      location: "Taipei, Taiwan",
      summary: {
        text: "Built systems\n- Scaled API",
        bullets: ["Built systems", "Scaled API"],
      },
      media: {
        logoUrl: "https://example.com/logo-1.png",
      },
    });
    expect(sections[0]?.tags).toEqual(["Cloud", "Go"]);
    expect(sections[1]).toMatchObject({
      key: "education",
      title: "Education",
      order: 40,
    });
    expect(sections[1]?.groups[0]?.entries[0]?.period.label).toBe("Sep 2020 - Jun 2024");
  });
});
