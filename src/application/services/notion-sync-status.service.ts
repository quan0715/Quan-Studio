import { parseStoredNotionSchemaFieldMapping } from "@/application/services/notion-model-mapper.service";
import { integrationConfigKeys } from "@/domain/integration-config/integration-config";
import type { IntegrationConfigRepository } from "@/domain/integration-config/integration-config-repository";
import type { NotionModelDefinitionRepository } from "@/domain/notion-model-definition/notion-model-definition-repository";
import { NotionClient, type NotionSyncStatusLabel } from "@/infrastructure/notion/notion-client";

export class NotionSyncStatusService {
  constructor(
    private readonly notionClient: NotionClient,
    private readonly integrationConfigRepository?: IntegrationConfigRepository,
    private readonly notionModelDefinitionRepository?: NotionModelDefinitionRepository
  ) {}

  async setStatus(input: {
    pageId: string;
    status: NotionSyncStatusLabel;
    modelId?: string;
  }): Promise<void> {
    const pageId = input.pageId.trim();
    if (!pageId) {
      return;
    }

    try {
      const notionStatusField = await this.resolveStatusFieldName(input.modelId);
      if (notionStatusField && this.hasUpdatePageProperties()) {
        await this.notionClient.updatePageProperties(pageId, {
          [notionStatusField]: {
            status: {
              name: input.status,
            },
          },
        });
        return;
      }

      await this.notionClient.updatePageSyncStatus(pageId, input.status);
    } catch (error) {
      console.warn("[notion-sync] failed to update Sync Status", {
        pageId,
        status: input.status,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async resolveStatusFieldName(modelId: string | undefined): Promise<string | null> {
    if (!modelId || !this.integrationConfigRepository || !this.notionModelDefinitionRepository) {
      return null;
    }

    const model = await this.notionModelDefinitionRepository.findByModelKey(modelId.trim());
    if (!model) {
      return null;
    }

    const statusCandidates = model.fields.filter((field) => field.expectedType === "status");
    if (statusCandidates.length === 0) {
      return null;
    }

    const preferred =
      statusCandidates.find((field) => field.appField.includes("sync.status")) ??
      statusCandidates.find((field) => field.appField.includes("workflow.status")) ??
      statusCandidates[0];
    if (!preferred) {
      return null;
    }

    const mappingConfig = await this.integrationConfigRepository.findByKey(
      integrationConfigKeys.notionSchemaFieldMapping
    );
    const storedMapping = parseStoredNotionSchemaFieldMapping(mappingConfig?.value ?? "");
    const explicit = storedMapping.sources[model.schemaSource]?.[preferred.appField];
    const configured = explicit?.trim() || preferred.defaultNotionField?.trim() || null;

    return configured;
  }

  private hasUpdatePageProperties(): boolean {
    return typeof this.notionClient.updatePageProperties === "function";
  }
}

