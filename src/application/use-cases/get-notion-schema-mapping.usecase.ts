import { AppError } from "@/application/errors";
import { normalizeFieldName } from "@/shared/utils/type-guards";
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
import type { NotionModelDefinitionRepository } from "@/domain/notion-model-definition/notion-model-definition-repository";
import { toSchemaMappingFromDefinition } from "@/application/services/notion-model-definition-adapter";
import { NotionClient } from "@/infrastructure/notion/notion-client";

export type NotionSchemaFieldCheck = MapperNotionSchemaFieldCheck;

export type NotionSchemaMappingReport = {
  source: string;
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
  source: string;
  mappings: Record<string, string | null>;
};

export class GetNotionSchemaMappingUseCase {
  constructor(
    private readonly notionClient: NotionClient,
    private readonly integrationConfigRepository: IntegrationConfigRepository,
    private readonly notionModelDefinitionRepository: NotionModelDefinitionRepository,
    private readonly notionModelMapperService: NotionModelMapperService = new NotionModelMapperService()
  ) {}

  async execute(): Promise<NotionSchemaMappingOutput> {
    const schemaModels = await this.notionModelDefinitionRepository.listActive();
    const stored = await this.integrationConfigRepository.findByKey(
      integrationConfigKeys.notionSchemaFieldMapping
    );
    const storedMapping = parseStoredNotionSchemaFieldMapping(stored?.value ?? "");

    const reports = await Promise.all(
      schemaModels.map(async (model) => {
        const schema = toSchemaMappingFromDefinition(model);
        return this.inspect({
          source: model.schemaSource,
          dataSourceId: model.dataSourceId ?? "",
          expectations: schema.expectations,
          builtinChecks: schema.builtinChecks,
          explicitMappings: storedMapping.sources[model.schemaSource] ?? {},
        });
      })
    );

    return {
      generatedAt: new Date().toISOString(),
      reports,
    };
  }

  private async inspect(input: {
    source: string;
    dataSourceId: string;
    expectations: ReturnType<typeof toSchemaMappingFromDefinition>["expectations"];
    builtinChecks: ReturnType<typeof toSchemaMappingFromDefinition>["builtinChecks"];
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
        builtinChecks: input.builtinChecks,
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
  constructor(
    private readonly integrationConfigRepository: IntegrationConfigRepository,
    private readonly notionModelDefinitionRepository: NotionModelDefinitionRepository
  ) {}

  async execute(input: UpdateNotionSchemaMappingInput): Promise<void> {
    const descriptor = await this.notionModelDefinitionRepository.findBySchemaSource(input.source);
    if (!descriptor) {
      throw new AppError("VALIDATION_ERROR", `source not found: ${input.source}`);
    }

    const allowedAppFields = new Set(descriptor.fields.map((item) => item.appField));

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

