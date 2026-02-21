import { AppError } from "@/application/errors";
import { normalizeModelKey } from "@/application/services/notion-model-definition-validator";
import type {
  ListNotionSourcePageDataSourcesService,
  SourcePageDataSourceCandidate,
} from "@/application/services/list-notion-source-page-data-sources.service";
import type { NotionModelDefinitionRepository } from "@/domain/notion-model-definition/notion-model-definition-repository";

export type NotionModelTemplate = string;

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
    private readonly notionModelDefinitionRepository: NotionModelDefinitionRepository,
    private readonly sourcePageId: string
  ) {}

  async execute(): Promise<NotionModelSettingsOutput> {
    const sourcePageId = this.resolveSourcePageId();
    const [models, candidates] = await Promise.all([
      this.notionModelDefinitionRepository.listActive(),
      this.sourcePageDataSourcesService.execute(sourcePageId),
    ]);

    return {
      sourcePage: {
        id: sourcePageId,
        configured: true,
      },
      models: models.map((item) => ({
        template: item.modelKey,
        displayName: item.defaultDisplayName,
        configuredDataSourceId: item.dataSourceId,
      })),
      availableTemplates: models.map((item) => ({
        id: item.modelKey,
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
    private readonly notionModelDefinitionRepository: NotionModelDefinitionRepository,
    private readonly sourcePageId: string
  ) {}

  async execute(input: SelectNotionModelSourceInput): Promise<void> {
    const dataSourceId = input.dataSourceId.trim();
    if (!dataSourceId) {
      throw new AppError("VALIDATION_ERROR", "dataSourceId is required");
    }

    const modelKey = normalizeModelKey(input.template);
    const descriptor = await this.notionModelDefinitionRepository.findByModelKey(modelKey);
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

    await this.notionModelDefinitionRepository.upsertBinding(descriptor.modelKey, dataSourceId);
  }

  private resolveSourcePageId(): string {
    const sourcePageId = this.sourcePageId.trim();
    if (!sourcePageId) {
      throw new AppError("VALIDATION_ERROR", "NOTION_SOURCE_PAGE_ID is not configured");
    }
    return sourcePageId;
  }
}

