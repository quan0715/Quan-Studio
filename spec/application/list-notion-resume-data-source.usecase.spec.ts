import { describe, expect, it } from "vitest";
import { ListNotionResumeDataSourceUseCase } from "@/application/use-cases/list-notion-resume-data-source.usecase";
import { integrationConfigKeys, type IntegrationConfig, type IntegrationConfigKey } from "@/domain/integration-config/integration-config";
import type { IntegrationConfigRepository } from "@/domain/integration-config/integration-config-repository";
import type { NotionClient } from "@/infrastructure/notion/notion-client";

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

describe("ListNotionResumeDataSourceUseCase", () => {
  it("returns VALIDATION_ERROR when resume data source id is missing", async () => {
    const repository = new InMemoryIntegrationConfigRepository();
    const useCase = new ListNotionResumeDataSourceUseCase(
      createNotionClientWithPages([]),
      repository
    );

    await expect(useCase.execute(10)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("uses schema field mapping overrides instead of hardcoded notion field names", async () => {
    const repository = new InMemoryIntegrationConfigRepository();
    await repository.upsert(integrationConfigKeys.notionResumeDataSourceId, "ds-resume");
    await repository.upsert(
      integrationConfigKeys.notionSchemaFieldMapping,
      JSON.stringify({
        version: 1,
        sources: {
          resume: {
            "resume.name": "Entry Name",
            "resume.section": "Entry Section",
            "resume.group": "Entry Group",
            "resume.summary": "Entry Summary",
            "resume.date": "Entry Date",
            "resume.tags": "Entry Tags",
            "resume.visibility": "Entry Visibility",
          },
        },
      })
    );

    const useCase = new ListNotionResumeDataSourceUseCase(
      createNotionClientWithPages([
        {
          object: "page",
          id: "resume-entry-1",
          created_time: "2026-01-01T00:00:00.000Z",
          last_edited_time: "2026-01-02T00:00:00.000Z",
          icon: {
            type: "external",
            external: {
              url: "https://example.com/logo.png",
            },
          },
          properties: {
            "Entry Name": { type: "title", title: [{ plain_text: "Mapped Resume Item" }] },
            "Entry Section": { type: "select", select: { name: "Experience" } },
            "Entry Group": { type: "rich_text", rich_text: [{ plain_text: "Acme" }] },
            "Entry Summary": { type: "rich_text", rich_text: [{ plain_text: "Did things" }] },
            "Entry Date": { type: "date", date: { start: "2024-01-01", end: null } },
            "Entry Tags": { type: "multi_select", multi_select: [{ name: "Backend" }] },
            "Entry Visibility": { type: "select", select: { name: "public" } },
          },
        },
      ]),
      repository
    );

    const output = await useCase.execute(10);

    expect(output.meta.dataSourceId).toBe("ds-resume");
    expect(output.sections[0]?.groups[0]?.entries[0]).toMatchObject({
      title: "Mapped Resume Item",
      tags: ["Backend"],
      media: {
        logoUrl: "https://example.com/logo.png",
      },
    });
  });

  it("falls back to descriptor notionField names when explicit mapping is missing", async () => {
    const repository = new InMemoryIntegrationConfigRepository();
    await repository.upsert(integrationConfigKeys.notionResumeDataSourceId, "ds-resume");

    const useCase = new ListNotionResumeDataSourceUseCase(
      createNotionClientWithPages([
        {
          object: "page",
          id: "resume-entry-1",
          created_time: "2026-01-01T00:00:00.000Z",
          last_edited_time: "2026-01-02T00:00:00.000Z",
          icon: { type: "emoji", emoji: "📘" },
          properties: {
            Name: { type: "title", title: [{ plain_text: "Default Named Item" }] },
            Section: { type: "select", select: { name: "Education" } },
            Group: { type: "rich_text", rich_text: [{ plain_text: "University" }] },
            Summary: { type: "rich_text", rich_text: [{ plain_text: "Learning" }] },
            Date: { type: "date", date: { start: "2022-09-01", end: "2024-06-30" } },
            Tags: { type: "multi_select", multi_select: [{ name: "CS" }] },
            Visibility: { type: "select", select: { name: "public" } },
          },
        },
      ]),
      repository
    );

    const output = await useCase.execute(10);
    expect(output.sections[0]?.groups[0]?.entries[0]?.title).toBe("Default Named Item");
    expect(output.sections[0]?.groups[0]?.entries[0]?.period.label).toBe("Sep 2022 - Jun 2024");
  });
});

