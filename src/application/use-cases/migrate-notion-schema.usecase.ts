import { AppError } from "@/application/errors";
import {
  buildMigrationPayload,
  computeSchemaDiff,
  type SchemaDiffAction,
} from "@/application/services/notion-schema-diff.service";
import {
  parseStoredNotionSchemaFieldMapping,
  toDataSourceProperties,
} from "@/application/services/notion-model-mapper.service";
import { toSchemaMappingFromDefinition } from "@/application/services/notion-model-definition-adapter";
import { normalizeModelKey } from "@/application/services/notion-model-definition-validator";
import { integrationConfigKeys } from "@/domain/integration-config/integration-config";
import type { IntegrationConfigRepository } from "@/domain/integration-config/integration-config-repository";
import type { NotionModelDefinitionRepository } from "@/domain/notion-model-definition/notion-model-definition-repository";
import type { NotionClient } from "@/infrastructure/notion/notion-client";

type MigrateInput = {
  modelId: string;
  allowDelete?: boolean;
  fieldName?: string;
};

type MigrateOutput = {
  dataSourceId: string;
  actions: SchemaDiffAction[];
  applied: SchemaDiffAction[];
  skipped: SchemaDiffAction[];
};

export class MigrateNotionSchemaUseCase {
  constructor(
    private readonly notionClient: NotionClient,
    private readonly integrationConfigRepository: IntegrationConfigRepository,
    private readonly notionModelDefinitionRepository: NotionModelDefinitionRepository
  ) {}

  async execute(input: MigrateInput): Promise<MigrateOutput> {
    const modelKey = normalizeModelKey(input.modelId);
    const descriptor = await this.notionModelDefinitionRepository.findByModelKey(modelKey);
    if (!descriptor) {
      throw new AppError("VALIDATION_ERROR", `unknown model id: ${input.modelId}`);
    }

    const dataSourceId = descriptor.dataSourceId?.trim() ?? "";
    if (!dataSourceId) {
      throw new AppError("VALIDATION_ERROR", `data source is not configured for model ${input.modelId}`);
    }

    const storedMappingConfig = await this.integrationConfigRepository.findByKey(
      integrationConfigKeys.notionSchemaFieldMapping
    );
    const storedMapping = parseStoredNotionSchemaFieldMapping(storedMappingConfig?.value ?? "");
    const explicitMappings = storedMapping.sources[descriptor.schemaSource] ?? {};

    const dataSource = await this.notionClient.retrieveDataSource(dataSourceId);
    const currentProperties = toDataSourceProperties(dataSource.properties);
    const schema = toSchemaMappingFromDefinition(descriptor);

    const actions = computeSchemaDiff({
      expectations: schema.expectations,
      currentProperties,
      explicitMappings,
    });
    const scopedActions = input.fieldName
      ? actions.filter((action) => schemaDiffActionMatchesField(action, input.fieldName!))
      : actions;

    const allowDelete = input.allowDelete ?? false;
    const applied = allowDelete ? scopedActions : scopedActions.filter((a) => a.kind !== "delete");
    const skipped = allowDelete ? [] : scopedActions.filter((a) => a.kind === "delete");

    if (applied.length > 0) {
      const payload = buildMigrationPayload(applied);
      await this.notionClient.updateDataSourceProperties(dataSourceId, payload);
    }

    return {
      dataSourceId,
      actions: scopedActions,
      applied,
      skipped,
    };
  }
}

function schemaDiffActionMatchesField(action: SchemaDiffAction, fieldName: string): boolean {
  if (action.kind === "rename") {
    return action.fromName === fieldName || action.toName === fieldName;
  }
  return action.fieldName === fieldName;
}
