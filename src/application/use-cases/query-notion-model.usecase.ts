import { AppError } from "@/application/errors";
import {
  NotionModelMapperService,
  parseStoredNotionSchemaFieldMapping,
} from "@/application/services/notion-model-mapper.service";
import { QueryNotionModelDataService } from "@/application/services/query-notion-model-data.service";
import { toSchemaMappingFromDefinition } from "@/application/services/notion-model-definition-adapter";
import { normalizeModelKey } from "@/application/services/notion-model-definition-validator";
import { integrationConfigKeys } from "@/domain/integration-config/integration-config";
import type { IntegrationConfigRepository } from "@/domain/integration-config/integration-config-repository";
import type {
  NotionModelDefinitionRepository,
} from "@/domain/notion-model-definition/notion-model-definition-repository";
import { isPlainObject } from "@/shared/utils/type-guards";

export type QueryNotionModelOutput = {
  meta: {
    modelKey: string;
    dataSourceId: string;
    generatedAt: string;
    schemaVersion: number;
  };
  rows: Array<Record<string, unknown>>;
};

export class QueryNotionModelUseCase {
  private readonly notionModelMapperService = new NotionModelMapperService();

  constructor(
    private readonly queryService: QueryNotionModelDataService,
    private readonly integrationConfigRepository: IntegrationConfigRepository,
    private readonly notionModelDefinitionRepository: NotionModelDefinitionRepository
  ) {}

  async execute(modelKeyRaw: string, limit = 200): Promise<QueryNotionModelOutput> {
    const modelKey = normalizeModelKey(modelKeyRaw);
    const model = await this.notionModelDefinitionRepository.findByModelKey(modelKey);
    if (!model || !model.isActive) {
      throw new AppError("VALIDATION_ERROR", `unknown model: ${modelKeyRaw}`);
    }
    if (!model.schemaSource || model.fields.length === 0) {
      throw new AppError("VALIDATION_ERROR", `model ${modelKey} has no schema mapping configured`);
    }
    const dataSourceId = model.dataSourceId?.trim() ?? "";
    if (!dataSourceId) {
      throw new AppError(
        "VALIDATION_ERROR",
        `data source for model ${modelKey} is not configured`
      );
    }

    const pages = await this.queryService.queryPages({ dataSourceId, limit });
    const schema = toSchemaMappingFromDefinition(model);

    const schemaFieldMappingRaw = await this.integrationConfigRepository.findByKey(
      integrationConfigKeys.notionSchemaFieldMapping
    );
    const storedMapping = parseStoredNotionSchemaFieldMapping(schemaFieldMappingRaw?.value ?? "");
    const explicitMappings = storedMapping.sources[model.schemaSource] ?? {};

    const rows = pages.map((page) => {
      const mapped = this.notionModelMapperService.mapPageFields({
        expectations: schema.expectations,
        builtinChecks: schema.builtinChecks,
        explicitMappings,
        page: toPageLike(page),
      });
      const pageId = typeof page.id === "string" ? page.id : "";
      return {
        __pageId: pageId || null,
        ...mapped,
      };
    });

    return {
      meta: {
        modelKey: model.modelKey,
        dataSourceId,
        generatedAt: new Date().toISOString(),
        schemaVersion: 1,
      },
      rows,
    };
  }
}

function toPageLike(page: Record<string, unknown>) {
  return {
    created_time: typeof page.created_time === "string" ? page.created_time : "",
    last_edited_time: typeof page.last_edited_time === "string" ? page.last_edited_time : "",
    cover: page.cover,
    icon: page.icon,
    properties: isPlainObject(page.properties) ? page.properties : {},
  };
}
