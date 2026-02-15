import { AppError } from "@/application/errors";
import {
  NotionModelMapperService,
  parseStoredNotionSchemaFieldMapping,
  toDataSourceProperties,
  type DataSourceProperty,
  type NotionSchemaFieldCheck as MapperNotionSchemaFieldCheck,
  type StoredNotionSchemaFieldMapping,
} from "@/application/services/notion-model-mapper.service";
import { integrationConfigKeys } from "@/domain/integration-config/integration-config";
import type { IntegrationConfigRepository } from "@/domain/integration-config/integration-config-repository";
import {
  getNotionModelBySchemaSource,
  listNotionSchemaModels,
  listNotionSchemaSources,
  type NotionSchemaSource,
} from "@/domain/notion-models/registry";
import { NotionClient } from "@/infrastructure/notion/notion-client";

export type NotionSchemaFieldCheck = MapperNotionSchemaFieldCheck;

export type NotionSchemaMappingReport = {
  source: NotionSchemaSource;
  dataSourceId: string;
  configured: boolean;
  ok: boolean;
  message: string;
  checks: NotionSchemaFieldCheck[];
  availableProperties: DataSourceProperty[];
};

export type NotionSchemaMappingOutput = {
  generatedAt: string;
  reports: NotionSchemaMappingReport[];
};

type UpdateNotionSchemaMappingInput = {
  source: NotionSchemaSource;
  mappings: Record<string, string | null>;
};

export class GetNotionSchemaMappingUseCase {
  constructor(
    private readonly notionClient: NotionClient,
    private readonly integrationConfigRepository: IntegrationConfigRepository,
    private readonly notionModelMapperService: NotionModelMapperService = new NotionModelMapperService()
  ) {}

  async execute(): Promise<NotionSchemaMappingOutput> {
    const schemaModels = listNotionSchemaModels();
    const configKeys = [
      integrationConfigKeys.notionSchemaFieldMapping,
      ...new Set(schemaModels.map((model) => model.dataSourceConfigKey)),
    ];
    const configs = await this.integrationConfigRepository.findByKeys(configKeys);
    const map = new Map(configs.map((config) => [config.key, config.value.trim()]));

    const storedMapping = parseStoredNotionSchemaFieldMapping(
      map.get(integrationConfigKeys.notionSchemaFieldMapping) ?? ""
    );

    const reports = await Promise.all(
      schemaModels.map((model) =>
        this.inspect({
          source: model.schemaSource,
          dataSourceId: map.get(model.dataSourceConfigKey) ?? "",
          expectations: model.schemaMapping.expectations,
          builtinChecks: model.schemaMapping.builtinChecks ?? [],
          explicitMappings: storedMapping.sources[model.schemaSource] ?? {},
        })
      )
    );

    return {
      generatedAt: new Date().toISOString(),
      reports,
    };
  }

  private async inspect(input: {
    source: NotionSchemaSource;
    dataSourceId: string;
    expectations: NonNullable<ReturnType<typeof listNotionSchemaModels>[number]["schemaMapping"]>["expectations"];
    builtinChecks: NonNullable<ReturnType<typeof listNotionSchemaModels>[number]["schemaMapping"]>["builtinChecks"];
    explicitMappings: Record<string, string>;
  }): Promise<NotionSchemaMappingReport> {
    const normalizedDataSourceId = input.dataSourceId.trim();

    if (!normalizedDataSourceId) {
      return {
        source: input.source,
        dataSourceId: "",
        configured: false,
        ok: false,
        message: "Data source id is not configured.",
        checks: this.notionModelMapperService.buildMissingConfigChecks({
          expectations: input.expectations,
          explicitMappings: input.explicitMappings,
        }),
        availableProperties: [],
      };
    }

    try {
      const dataSource = await this.notionClient.retrieveDataSource(normalizedDataSourceId);
      const properties = toDataSourceProperties(dataSource.properties);
      const evaluation = this.notionModelMapperService.evaluateSchema({
        expectations: input.expectations,
        builtinChecks: input.builtinChecks ?? [],
        properties,
        explicitMappings: input.explicitMappings,
      });

      return {
        source: input.source,
        dataSourceId: normalizedDataSourceId,
        configured: true,
        ok: evaluation.ok,
        message: evaluation.ok
          ? "Schema mapping is valid."
          : `Found ${evaluation.requiredMissingCount} missing required field(s), ${evaluation.mismatchCount} type mismatch(es).`,
        checks: evaluation.checks,
        availableProperties: properties,
      };
    } catch (error) {
      return {
        source: input.source,
        dataSourceId: normalizedDataSourceId,
        configured: true,
        ok: false,
        message: error instanceof Error ? error.message : "Failed to inspect Notion schema.",
        checks: [],
        availableProperties: [],
      };
    }
  }
}

export class UpdateNotionSchemaMappingUseCase {
  constructor(private readonly integrationConfigRepository: IntegrationConfigRepository) {}

  async execute(input: UpdateNotionSchemaMappingInput): Promise<void> {
    const descriptor = getNotionModelBySchemaSource(input.source);
    if (!descriptor) {
      const allowed = listNotionSchemaSources().join(", ");
      throw new AppError("VALIDATION_ERROR", `source must be one of: ${allowed}`);
    }

    const allowedAppFields = new Set(
      descriptor.schemaMapping.expectations.map((item) => item.appField)
    );

    const stored = await this.integrationConfigRepository.findByKey(
      integrationConfigKeys.notionSchemaFieldMapping
    );
    const currentMapping = parseStoredNotionSchemaFieldMapping(stored?.value ?? "");
    const nextSourceMapping = { ...currentMapping.sources[input.source] };

    for (const [appField, notionField] of Object.entries(input.mappings)) {
      if (!allowedAppFields.has(appField)) {
        throw new AppError("VALIDATION_ERROR", `invalid appField: ${appField}`);
      }

      const normalizedField = normalizeFieldName(notionField);
      if (!normalizedField) {
        delete nextSourceMapping[appField];
      } else {
        nextSourceMapping[appField] = normalizedField;
      }
    }

    const nextMapping: StoredNotionSchemaFieldMapping = {
      version: 1,
      sources: {
        ...currentMapping.sources,
        [input.source]: nextSourceMapping,
      },
    };

    await this.integrationConfigRepository.upsert(
      integrationConfigKeys.notionSchemaFieldMapping,
      JSON.stringify(nextMapping)
    );
  }
}

function normalizeFieldName(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}
