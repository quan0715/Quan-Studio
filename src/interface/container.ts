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
import { ListNotionSyncJobsUseCase } from "@/application/use-cases/list-notion-sync-jobs.usecase";
import { ListStudioPostsUseCase } from "@/application/use-cases/list-studio-posts.usecase";
import {
  GetNotionModelSettingsUseCase,
  SelectNotionModelSourceUseCase,
} from "@/application/use-cases/manage-notion-model-settings.usecase";
import { QueryNotionModelUseCase } from "@/application/use-cases/query-notion-model.usecase";
import { ListNotionSourcePageDataSourcesService } from "@/application/services/list-notion-source-page-data-sources.service";
import { QueryNotionModelDataService } from "@/application/services/query-notion-model-data.service";
import { BuildResumeGroupedViewService } from "@/application/services/build-resume-grouped-view.service";
import { registerProjectionBuilder } from "@/application/services/projection-builder-registry";
import { ProcessNextNotionSyncJobUseCase } from "@/application/use-cases/process-next-notion-sync-job.usecase";
import { BlogSyncHandler } from "@/application/sync-handlers/blog-sync-handler";
import { RetryNotionSyncJobUseCase } from "@/application/use-cases/retry-notion-sync-job.usecase";
import { NotionClient } from "@/infrastructure/notion/notion-client";
import { env } from "@/infrastructure/config/env";
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
  queryNotionModelUseCase: QueryNotionModelUseCase;
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

  // Projection builders
  registerProjectionBuilder("resume_grouped", new BuildResumeGroupedViewService());

  // Services
  const notionSourcePageDataSourcesService = new ListNotionSourcePageDataSourcesService(
    notionClient
  );
  const queryNotionModelDataService = new QueryNotionModelDataService(notionClient);

  // Sync handlers
  const blogSyncHandler = new BlogSyncHandler(
    postRepository,
    notionClient,
    integrationConfigRepository
  );

  const getNotionModelSettingsUseCase = new GetNotionModelSettingsUseCase(
    notionSourcePageDataSourcesService,
    integrationConfigRepository,
    env.notionSourcePageId
  );
  const selectNotionModelSourceUseCase = new SelectNotionModelSourceUseCase(
    notionSourcePageDataSourcesService,
    integrationConfigRepository,
    env.notionSourcePageId
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
      notionClient,
      [blogSyncHandler]
    ),
    listNotionSyncJobsUseCase: new ListNotionSyncJobsUseCase(notionSyncJobRepository),
    listNotionDataSourcePagesUseCase: new ListNotionDataSourcePagesUseCase(
      notionClient,
      integrationConfigRepository,
      postRepository
    ),
    queryNotionModelUseCase: new QueryNotionModelUseCase(
      queryNotionModelDataService,
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

  if (!globalThis.__quanStudioContainer) {
    globalThis.__quanStudioContainer = createContainer();
  }

  return globalThis.__quanStudioContainer;
}
