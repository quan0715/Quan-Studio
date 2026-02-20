import { EnqueueNotionSyncJobUseCase } from "@/application/use-cases/enqueue-notion-sync-job.usecase";
import { EnqueuePublishedNotionSyncJobsUseCase } from "@/application/use-cases/enqueue-published-notion-sync-jobs.usecase";
import { GetPublicPostBySlugUseCase } from "@/application/use-cases/get-public-post-by-slug.usecase";
import {
  GetNotionSchemaMappingUseCase,
  UpdateNotionSchemaMappingUseCase,
} from "@/application/use-cases/get-notion-schema-mapping.usecase";
import { GetStudioPostByNotionPageIdUseCase } from "@/application/use-cases/get-studio-post-by-notion-page-id.usecase";
import { ListPublicPostsUseCase } from "@/application/use-cases/list-public-posts.usecase";
import { ListNotionDataSourcePagesUseCase } from "@/application/use-cases/list-notion-data-source-pages.usecase";
import { ListNotionResumeDataSourceUseCase } from "@/application/use-cases/list-notion-resume-data-source.usecase";
import { ListNotionSyncJobsUseCase } from "@/application/use-cases/list-notion-sync-jobs.usecase";
import { ListStudioPostsUseCase } from "@/application/use-cases/list-studio-posts.usecase";
import {
  GetNotionModelSettingsUseCase,
  SelectNotionModelSourceUseCase,
} from "@/application/use-cases/manage-notion-model-settings.usecase";
import { ListNotionSourcePageDataSourcesService } from "@/application/services/list-notion-source-page-data-sources.service";
import { ProcessNextNotionSyncJobUseCase } from "@/application/use-cases/process-next-notion-sync-job.usecase";
import { RetryNotionSyncJobUseCase } from "@/application/use-cases/retry-notion-sync-job.usecase";
import { NotionClient } from "@/infrastructure/notion/notion-client";
import { PrismaIntegrationConfigRepository } from "@/infrastructure/repositories/prisma-integration-config-repository";
import { PrismaNotionSyncJobRepository } from "@/infrastructure/repositories/prisma-notion-sync-job-repository";
import { PrismaPostRepository } from "@/infrastructure/repositories/prisma-post-repository";

type Container = {
  listStudioPostsUseCase: ListStudioPostsUseCase;
  getStudioPostByNotionPageIdUseCase: GetStudioPostByNotionPageIdUseCase;
  listPublicPostsUseCase: ListPublicPostsUseCase;
  getPublicPostBySlugUseCase: GetPublicPostBySlugUseCase;
  enqueueNotionSyncJobUseCase: EnqueueNotionSyncJobUseCase;
  enqueuePublishedNotionSyncJobsUseCase: EnqueuePublishedNotionSyncJobsUseCase;
  processNextNotionSyncJobUseCase: ProcessNextNotionSyncJobUseCase;
  listNotionSyncJobsUseCase: ListNotionSyncJobsUseCase;
  listNotionDataSourcePagesUseCase: ListNotionDataSourcePagesUseCase;
  listNotionResumeDataSourceUseCase: ListNotionResumeDataSourceUseCase;
  retryNotionSyncJobUseCase: RetryNotionSyncJobUseCase;
  getNotionModelSettingsUseCase: GetNotionModelSettingsUseCase;
  selectNotionModelSourceUseCase: SelectNotionModelSourceUseCase;
  getNotionSchemaMappingUseCase: GetNotionSchemaMappingUseCase;
  updateNotionSchemaMappingUseCase: UpdateNotionSchemaMappingUseCase;
};

declare global {
  var __quanStudioContainer: Container | undefined;
}

function createContainer(): Container {
  const postRepository = new PrismaPostRepository();
  const notionSyncJobRepository = new PrismaNotionSyncJobRepository();
  const integrationConfigRepository = new PrismaIntegrationConfigRepository();
  const notionClient = new NotionClient();
  const notionSourcePageDataSourcesService = new ListNotionSourcePageDataSourcesService(
    notionClient
  );
  const getNotionModelSettingsUseCase = new GetNotionModelSettingsUseCase(
    notionSourcePageDataSourcesService,
    integrationConfigRepository
  );
  const selectNotionModelSourceUseCase = new SelectNotionModelSourceUseCase(
    notionSourcePageDataSourcesService,
    integrationConfigRepository
  );

  return {
    listStudioPostsUseCase: new ListStudioPostsUseCase(postRepository),
    getStudioPostByNotionPageIdUseCase: new GetStudioPostByNotionPageIdUseCase(postRepository),
    listPublicPostsUseCase: new ListPublicPostsUseCase(postRepository),
    getPublicPostBySlugUseCase: new GetPublicPostBySlugUseCase(postRepository),
    enqueueNotionSyncJobUseCase: new EnqueueNotionSyncJobUseCase(
      notionSyncJobRepository,
      notionClient
    ),
    enqueuePublishedNotionSyncJobsUseCase: new EnqueuePublishedNotionSyncJobsUseCase(
      postRepository,
      notionSyncJobRepository
    ),
    processNextNotionSyncJobUseCase: new ProcessNextNotionSyncJobUseCase(
      notionSyncJobRepository,
      postRepository,
      notionClient,
      integrationConfigRepository
    ),
    listNotionSyncJobsUseCase: new ListNotionSyncJobsUseCase(notionSyncJobRepository),
    listNotionDataSourcePagesUseCase: new ListNotionDataSourcePagesUseCase(
      notionClient,
      integrationConfigRepository,
      postRepository
    ),
    listNotionResumeDataSourceUseCase: new ListNotionResumeDataSourceUseCase(
      notionClient,
      integrationConfigRepository
    ),
    retryNotionSyncJobUseCase: new RetryNotionSyncJobUseCase(notionSyncJobRepository, notionClient),
    getNotionModelSettingsUseCase,
    selectNotionModelSourceUseCase,
    getNotionSchemaMappingUseCase: new GetNotionSchemaMappingUseCase(
      notionClient,
      integrationConfigRepository
    ),
    updateNotionSchemaMappingUseCase: new UpdateNotionSchemaMappingUseCase(
      integrationConfigRepository
    ),
  };
}

export function getContainer(): Container {
  if (process.env.NODE_ENV !== "production") {
    return createContainer();
  }

  if (!isContainerInitialized(globalThis.__quanStudioContainer)) {
    globalThis.__quanStudioContainer = createContainer();
  }

  return globalThis.__quanStudioContainer;
}

function isContainerInitialized(container: Container | undefined): container is Container {
  return Boolean(
    container &&
      container.listStudioPostsUseCase &&
      container.getStudioPostByNotionPageIdUseCase &&
      container.listPublicPostsUseCase &&
      container.getPublicPostBySlugUseCase &&
      container.enqueueNotionSyncJobUseCase &&
      container.enqueuePublishedNotionSyncJobsUseCase &&
      container.processNextNotionSyncJobUseCase &&
      container.listNotionSyncJobsUseCase &&
      container.listNotionDataSourcePagesUseCase &&
      container.listNotionResumeDataSourceUseCase &&
      container.retryNotionSyncJobUseCase &&
      container.getNotionModelSettingsUseCase &&
      container.selectNotionModelSourceUseCase &&
      container.getNotionSchemaMappingUseCase &&
      container.updateNotionSchemaMappingUseCase
  );
}
