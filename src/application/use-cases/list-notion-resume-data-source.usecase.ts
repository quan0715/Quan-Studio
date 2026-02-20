import { AppError } from "@/application/errors";
import { BuildResumeGroupedViewService, type ResumeSectionView } from "@/application/services/build-resume-grouped-view.service";
import {
  NotionModelMapperService,
  parseStoredNotionSchemaFieldMapping,
} from "@/application/services/notion-model-mapper.service";
import { integrationConfigKeys } from "@/domain/integration-config/integration-config";
import type { IntegrationConfigRepository } from "@/domain/integration-config/integration-config-repository";
import type {
  NotionModelDescriptor,
  NotionResumeGroupedProjectionDescriptor,
} from "@/domain/notion-models/model-descriptor";
import { getNotionModelById } from "@/domain/notion-models/registry";
import { NotionClient } from "@/infrastructure/notion/notion-client";

type NotionQueryResponse = {
  object: "list";
  results: Array<Record<string, unknown>>;
  has_more: boolean;
  next_cursor: string | null;
};

export type ResumeResponseOutput = {
  meta: {
    generatedAt: string;
    dataSourceId: string;
  };
  sections: ResumeSectionView[];
};

export class ListNotionResumeDataSourceUseCase {
  private readonly buildResumeGroupedViewService: BuildResumeGroupedViewService;

  constructor(
    private readonly notionClient: NotionClient,
    private readonly integrationConfigRepository: IntegrationConfigRepository
  ) {
    const notionModelMapperService = new NotionModelMapperService();
    this.buildResumeGroupedViewService = new BuildResumeGroupedViewService(notionModelMapperService);
  }

  async execute(limit = 200): Promise<ResumeResponseOutput> {
    const normalizedLimit = Math.min(Math.max(Math.floor(limit), 1), 500);
    const configured = await this.integrationConfigRepository.findByKey(
      integrationConfigKeys.notionResumeDataSourceId
    );
    const dataSourceId = configured?.value.trim() ?? "";

    if (!dataSourceId) {
      throw new AppError("VALIDATION_ERROR", "Notion resume data source id is not configured");
    }

    const pages: Array<Record<string, unknown>> = [];
    let cursor: string | undefined;

    while (pages.length < normalizedLimit) {
      const pageSize = Math.min(100, normalizedLimit - pages.length);
      const response = (await this.notionClient.queryDataSourceWithId(
        dataSourceId,
        pageSize,
        cursor
      )) as NotionQueryResponse;
      pages.push(...response.results);

      if (!response.has_more || !response.next_cursor) {
        break;
      }
      cursor = response.next_cursor;
    }

    const resumeModel = getResumeModel();
    const schemaFieldMappingRaw = await this.integrationConfigRepository.findByKey(
      integrationConfigKeys.notionSchemaFieldMapping
    );
    const storedMapping = parseStoredNotionSchemaFieldMapping(schemaFieldMappingRaw?.value ?? "");
    const explicitMappings = storedMapping.sources[resumeModel.schemaSource] ?? {};

    const sections = this.buildResumeGroupedViewService.build({
      pages,
      model: resumeModel,
      explicitMappings,
    });

    return {
      meta: {
        generatedAt: new Date().toISOString(),
        dataSourceId,
      },
      sections,
    };
  }
}

function getResumeModel(): {
  id: string;
  schemaSource: string;
  schemaMapping: NonNullable<NotionModelDescriptor["schemaMapping"]>;
  projection: NotionResumeGroupedProjectionDescriptor;
} {
  const model = getNotionModelById("resume");
  if (
    !model ||
    !model.schemaSource ||
    !model.schemaMapping ||
    !model.projection ||
    model.projection.kind !== "resume_grouped"
  ) {
    throw new AppError("INTERNAL_ERROR", "resume model descriptor is not configured correctly");
  }

  return {
    id: model.id,
    schemaSource: model.schemaSource,
    schemaMapping: model.schemaMapping,
    projection: model.projection,
  };
}
