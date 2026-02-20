import { describe, expect, it, vi } from "vitest";
import {
  GetNotionSchemaMappingUseCase,
  UpdateNotionSchemaMappingUseCase,
} from "@/application/use-cases/get-notion-schema-mapping.usecase";
import { integrationConfigKeys, type IntegrationConfigKey } from "@/domain/integration-config/integration-config";
import type { IntegrationConfig } from "@/domain/integration-config/integration-config";
import type { IntegrationConfigRepository } from "@/domain/integration-config/integration-config-repository";
import { blogNotionModel } from "@/domain/notion-models/blog.notion";
import { resumeNotionModel } from "@/domain/notion-models/resume.notion";
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

describe("GetNotionSchemaMappingUseCase", () => {
  it("builds schema checks from notion model descriptors", async () => {
    const repository = new InMemoryIntegrationConfigRepository();
    await repository.upsert(integrationConfigKeys.notionBlogDataSourceId, "ds-blog");
    await repository.upsert(integrationConfigKeys.notionResumeDataSourceId, "ds-resume");

    const retrieveDataSource = vi.fn(async (dataSourceId: string) => {
      if (dataSourceId === "ds-blog") {
        return {
          id: "ds-blog",
          properties: {
            Name: { type: "title" },
            "Sync Status": { type: "status" },
            Status: { type: "select" },
          },
        };
      }

      return {
        id: "ds-resume",
        properties: {
          Name: { type: "title" },
          Section: { type: "select" },
        },
      };
    });

    const useCase = new GetNotionSchemaMappingUseCase(
      {
        retrieveDataSource,
      } as unknown as NotionClient,
      repository
    );

    const output = await useCase.execute();

    const blogReport = output.reports.find((report) => report.source === "blog");
    const resumeReport = output.reports.find((report) => report.source === "resume");
    const expectedBlogFields = blogNotionModel.schemaMapping
      ? blogNotionModel.schemaMapping.expectations.map((item) => item.appField)
      : [];
    const expectedBlogBuiltinFields = blogNotionModel.schemaMapping
      ? (blogNotionModel.schemaMapping.builtinChecks ?? []).map((item) => item.appField)
      : [];
    const expectedResumeFields = resumeNotionModel.schemaMapping
      ? resumeNotionModel.schemaMapping.expectations.map((item) => item.appField)
      : [];
    const expectedResumeBuiltinFields = resumeNotionModel.schemaMapping
      ? (resumeNotionModel.schemaMapping.builtinChecks ?? []).map((item) => item.appField)
      : [];

    expect(blogReport).toBeDefined();
    expect(resumeReport).toBeDefined();

    expect(
      blogReport?.checks
        .filter((check) => check.expectedType !== "builtin")
        .map((check) => check.appField)
    ).toEqual(expectedBlogFields);

    expect(
      blogReport?.checks
        .filter((check) => check.expectedType === "builtin")
        .map((check) => check.appField)
    ).toEqual(expectedBlogBuiltinFields);

    expect(
      resumeReport?.checks
        .filter((check) => check.expectedType !== "builtin")
        .map((check) => check.appField)
    ).toEqual(expectedResumeFields);

    expect(
      resumeReport?.checks
        .filter((check) => check.expectedType === "builtin")
        .map((check) => check.appField)
    ).toEqual(expectedResumeBuiltinFields);
  });
});

describe("UpdateNotionSchemaMappingUseCase", () => {
  it("validates appField by selected descriptor expectations", async () => {
    const repository = new InMemoryIntegrationConfigRepository();
    const useCase = new UpdateNotionSchemaMappingUseCase(repository);

    await expect(
      useCase.execute({
        source: "blog",
        mappings: {
          "resume.name": "Name",
        },
      })
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });

    await expect(
      useCase.execute({
        source: "blog",
        mappings: {
          "post.title": "Title",
        },
      })
    ).resolves.toBeUndefined();

    const stored = await repository.findByKey(integrationConfigKeys.notionSchemaFieldMapping);
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!.value)).toMatchObject({
      version: 1,
      sources: {
        blog: {
          "post.title": "Title",
        },
      },
    });
  });

  it("rejects unknown schema source", async () => {
    const useCase = new UpdateNotionSchemaMappingUseCase(new InMemoryIntegrationConfigRepository());

    await expect(
      useCase.execute({
        source: "unknown" as unknown as "blog",
        mappings: {},
      })
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });
});
