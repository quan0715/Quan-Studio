import { AppError } from "@/application/errors";
import type {
  ListNotionSourcePageDataSourcesService,
  SourcePageDataSourceCandidate,
} from "@/application/services/list-notion-source-page-data-sources.service";
import type { IntegrationConfigKey } from "@/domain/integration-config/integration-config";
import type { IntegrationConfigRepository } from "@/domain/integration-config/integration-config-repository";
import { getNotionModelById, listNotionModels, type NotionModelId } from "@/domain/notion-models/registry";

export type NotionModelTemplate = NotionModelId;

export type RegisteredModelOutput = {
  template: NotionModelTemplate;
  displayName: string;
  configuredDataSourceId: string | null;
};

export type NotionModelSettingsOutput = {
  sourcePage: {
    id: string;
    configured: boolean;
  };
  models: RegisteredModelOutput[];
  availableTemplates: Array<{
    id: NotionModelTemplate;
    label: string;
    defaultDisplayName: string;
    schemaSource: string | null;
  }>;
  candidates: SourcePageDataSourceCandidate[];
  meta: {
    generatedAt: string;
    candidateCount: number;
  };
};

type SelectNotionModelSourceInput = {
  template: NotionModelTemplate;
  dataSourceId: string;
};

export class GetNotionModelSettingsUseCase {
  constructor(
    private readonly sourcePageDataSourcesService: ListNotionSourcePageDataSourcesService,
    private readonly integrationConfigRepository: IntegrationConfigRepository,
    private readonly sourcePageId: string
  ) {}

  async execute(): Promise<NotionModelSettingsOutput> {
    const sourcePageId = this.resolveSourcePageId();
    const availableTemplates = listNotionModels();
    const [configs, candidates] = await Promise.all([
      this.integrationConfigRepository.findByKeys([
        ...new Set(availableTemplates.map((item) => item.dataSourceConfigKey)),
      ]),
      this.sourcePageDataSourcesService.execute(sourcePageId),
    ]);

    const configMap = new Map(configs.map((item) => [item.key, item.value.trim()]));
    const models = availableTemplates.map((item) => ({
      template: item.id as NotionModelTemplate,
      displayName: item.defaultDisplayName,
      configuredDataSourceId: resolveConfiguredDataSourceId(item.dataSourceConfigKey, configMap),
    }));

    return {
      sourcePage: {
        id: sourcePageId,
        configured: true,
      },
      models,
      availableTemplates: availableTemplates.map((item) => ({
        id: item.id as NotionModelTemplate,
        label: item.label,
        defaultDisplayName: item.defaultDisplayName,
        schemaSource: item.schemaSource,
      })),
      candidates,
      meta: {
        generatedAt: new Date().toISOString(),
        candidateCount: candidates.length,
      },
    };
  }

  private resolveSourcePageId(): string {
    const sourcePageId = this.sourcePageId.trim();
    if (!sourcePageId) {
      throw new AppError("VALIDATION_ERROR", "NOTION_SOURCE_PAGE_ID is not configured");
    }
    return sourcePageId;
  }
}

export class SelectNotionModelSourceUseCase {
  constructor(
    private readonly sourcePageDataSourcesService: ListNotionSourcePageDataSourcesService,
    private readonly integrationConfigRepository: IntegrationConfigRepository,
    private readonly sourcePageId: string
  ) {}

  async execute(input: SelectNotionModelSourceInput): Promise<void> {
    const dataSourceId = input.dataSourceId.trim();
    if (!dataSourceId) {
      throw new AppError("VALIDATION_ERROR", "dataSourceId is required");
    }

    const descriptor = getNotionModelById(input.template);
    if (!descriptor) {
      throw new AppError("VALIDATION_ERROR", `unknown template: ${input.template}`);
    }

    const sourcePageId = this.resolveSourcePageId();
    const candidates = await this.sourcePageDataSourcesService.execute(sourcePageId);
    const target = candidates.find((item) => item.dataSourceId === dataSourceId);
    if (!target) {
      throw new AppError(
        "VALIDATION_ERROR",
        `dataSourceId ${dataSourceId} was not found under current source page`
      );
    }

    await this.integrationConfigRepository.upsert(descriptor.dataSourceConfigKey, dataSourceId);
  }

  private resolveSourcePageId(): string {
    const sourcePageId = this.sourcePageId.trim();
    if (!sourcePageId) {
      throw new AppError("VALIDATION_ERROR", "NOTION_SOURCE_PAGE_ID is not configured");
    }
    return sourcePageId;
  }
}

function resolveConfiguredDataSourceId(
  configKey: IntegrationConfigKey,
  configMap: Map<IntegrationConfigKey, string>
): string | null {
  const value = configMap.get(configKey);
  return value && value.length > 0 ? value : null;
}
