import { AppError } from "@/application/errors";
import {
  toNotionPropertySchema,
  toNotionPropertyType,
} from "@/application/services/notion-schema-diff.service";
import { normalizeModelKey } from "@/application/services/notion-model-definition-validator";
import type { NotionModelDefinitionRepository } from "@/domain/notion-model-definition/notion-model-definition-repository";
import type { NotionClient } from "@/infrastructure/notion/notion-client";

type ProvisionInput = {
  modelId: string;
  displayName?: string;
};

type ProvisionOutput = {
  databaseId: string;
  dataSourceId: string;
  displayName: string;
};

export class ProvisionNotionDatabaseUseCase {
  constructor(
    private readonly notionClient: NotionClient,
    private readonly notionModelDefinitionRepository: NotionModelDefinitionRepository,
    private readonly sourcePageId: string
  ) {}

  async execute(input: ProvisionInput): Promise<ProvisionOutput> {
    if (!this.sourcePageId.trim()) {
      throw new AppError("VALIDATION_ERROR", "NOTION_SOURCE_PAGE_ID is not configured");
    }

    const modelKey = normalizeModelKey(input.modelId);
    const descriptor = await this.notionModelDefinitionRepository.findByModelKey(modelKey);
    if (!descriptor) {
      throw new AppError("VALIDATION_ERROR", `unknown model id: ${input.modelId}`);
    }

    const displayName = input.displayName?.trim() || descriptor.defaultDisplayName;

    const properties: Record<string, Record<string, unknown>> = {};
    for (const field of descriptor.fields) {
      if (field.expectedType === "builtin") {
        continue;
      }
      const notionField = field.defaultNotionField?.trim();
      if (!notionField) {
        continue;
      }
      const schema = toNotionPropertySchema(field.expectedType);
      const notionType = toNotionPropertyType(field.expectedType);
      if (schema && notionType) {
        properties[notionField] = { type: notionType, ...schema };
      }
    }

    const result = await this.notionClient.createDatabase({
      parentPageId: this.sourcePageId,
      title: displayName,
      properties,
    });

    await this.notionModelDefinitionRepository.upsertBinding(modelKey, result.dataSourceId);

    return {
      databaseId: result.databaseId,
      dataSourceId: result.dataSourceId,
      displayName,
    };
  }
}
