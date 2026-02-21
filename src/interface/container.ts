import { EnqueueNotionSyncJobUseCase } from "@/application/use-cases/enqueue-notion-sync-job.usecase";
import { EnqueuePublishedNotionSyncJobsUseCase } from "@/application/use-cases/enqueue-published-notion-sync-jobs.usecase";
import { GetPublicPostBySlugUseCase } from "@/application/use-cases/get-public-post-by-slug.usecase";
import {
  GetNotionSchemaMappingUseCase,
  UpdateNotionSchemaMappingUseCase,
} from "@/application/use-cases/get-notion-schema-mapping.usecase";
import {
  AddNotionModelFieldUseCase,
  CreateNotionModelDefinitionUseCase,
  DeleteNotionModelFieldUseCase,
  ListNotionModelDefinitionsUseCase,
  UpdateNotionModelDefinitionUseCase,
  UpdateNotionModelFieldUseCase,
} from "@/application/use-cases/manage-notion-model-definitions.usecase";
import { GetStudioPostByNotionPageIdUseCase } from "@/application/use-cases/get-studio-post-by-notion-page-id.usecase";
import { ListPublicPostsUseCase } from "@/application/use-cases/list-public-posts.usecase";
import { ListNotionDataSourcePagesUseCase } from "@/application/use-cases/list-notion-data-source-pages.usecase";
import { ListNotionSyncJobsUseCase } from "@/application/use-cases/list-notion-sync-jobs.usecase";
import { ListStudioPostsUseCase } from "@/application/use-cases/list-studio-posts.usecase";
import {
  GetNotionModelSettingsUseCase,
  SelectNotionModelSourceUseCase,
} from "@/application/use-cases/manage-notion-model-settings.usecase";
import { MigrateNotionSchemaUseCase } from "@/application/use-cases/migrate-notion-schema.usecase";
import { ProvisionNotionDatabaseUseCase } from "@/application/use-cases/provision-notion-database.usecase";
import { QueryNotionModelUseCase } from "@/application/use-cases/query-notion-model.usecase";
import { LiveNotionPublicPostGateway } from "@/application/services/live-notion-public-post-gateway";
import { ListNotionSourcePageDataSourcesService } from "@/application/services/list-notion-source-page-data-sources.service";
import { NotionSyncStatusService } from "@/application/services/notion-sync-status.service";
import { QueryNotionModelDataService } from "@/application/services/query-notion-model-data.service";
import { ProcessNextNotionSyncJobUseCase } from "@/application/use-cases/process-next-notion-sync-job.usecase";
import { BlogSyncHandler } from "@/application/sync-handlers/blog-sync-handler";
import { RetryNotionSyncJobUseCase } from "@/application/use-cases/retry-notion-sync-job.usecase";
import { NotionClient } from "@/infrastructure/notion/notion-client";
import { env } from "@/infrastructure/config/env";
import { PrismaIntegrationConfigRepository } from "@/infrastructure/repositories/prisma-integration-config-repository";
import { PrismaNotionModelDefinitionRepository } from "@/infrastructure/repositories/prisma-notion-model-definition-repository";
import { PrismaNotionSyncJobRepository } from "@/infrastructure/repositories/prisma-notion-sync-job-repository";
import { PostRepositoryPublicPostGateway } from "@/infrastructure/repositories/post-repository-public-post-gateway";
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
  listNotionModelDefinitionsUseCase: ListNotionModelDefinitionsUseCase;
  createNotionModelDefinitionUseCase: CreateNotionModelDefinitionUseCase;
  updateNotionModelDefinitionUseCase: UpdateNotionModelDefinitionUseCase;
  addNotionModelFieldUseCase: AddNotionModelFieldUseCase;
  updateNotionModelFieldUseCase: UpdateNotionModelFieldUseCase;
  deleteNotionModelFieldUseCase: DeleteNotionModelFieldUseCase;
  provisionNotionDatabaseUseCase: ProvisionNotionDatabaseUseCase;
  migrateNotionSchemaUseCase: MigrateNotionSchemaUseCase;
};

declare global {
  var __quanStudioContainer: Container | undefined;
}

function createContainer(): Container {
  const postRepository = new PrismaPostRepository();
  const notionSyncJobRepository = new PrismaNotionSyncJobRepository();
  const integrationConfigRepository = new PrismaIntegrationConfigRepository();
  const notionModelDefinitionRepository = new PrismaNotionModelDefinitionRepository();
  const notionClient = new NotionClient();

  // Services
  const notionSourcePageDataSourcesService = new ListNotionSourcePageDataSourcesService(
    notionClient
  );
  const queryNotionModelDataService = new QueryNotionModelDataService(notionClient);
  const notionSyncStatusService = new NotionSyncStatusService(
    notionClient,
    integrationConfigRepository,
    notionModelDefinitionRepository
  );
  const publicPostDataGateway =
    env.notionPublicReadMode === "live"
      ? new LiveNotionPublicPostGateway(
          notionClient,
          queryNotionModelDataService,
          integrationConfigRepository,
          notionModelDefinitionRepository
        )
      : new PostRepositoryPublicPostGateway(postRepository);

  // Sync handlers
  const blogSyncHandler = new BlogSyncHandler(
    postRepository,
    notionClient,
    integrationConfigRepository,
    notionModelDefinitionRepository
  );

  const getNotionModelSettingsUseCase = new GetNotionModelSettingsUseCase(
    notionSourcePageDataSourcesService,
    notionModelDefinitionRepository,
    env.notionSourcePageId
  );
  const selectNotionModelSourceUseCase = new SelectNotionModelSourceUseCase(
    notionSourcePageDataSourcesService,
    notionModelDefinitionRepository,
    env.notionSourcePageId
  );

  return {
    listStudioPostsUseCase: new ListStudioPostsUseCase(postRepository),
    getStudioPostByNotionPageIdUseCase: new GetStudioPostByNotionPageIdUseCase(postRepository),
    listPublicPostsUseCase: new ListPublicPostsUseCase(publicPostDataGateway),
    getPublicPostBySlugUseCase: new GetPublicPostBySlugUseCase(publicPostDataGateway),
    enqueueNotionSyncJobUseCase: new EnqueueNotionSyncJobUseCase(
      notionSyncJobRepository,
      notionClient,
      notionSyncStatusService
    ),
    enqueuePublishedNotionSyncJobsUseCase: new EnqueuePublishedNotionSyncJobsUseCase(
      postRepository,
      notionSyncJobRepository
    ),
    processNextNotionSyncJobUseCase: new ProcessNextNotionSyncJobUseCase(
      notionSyncJobRepository,
      notionClient,
      [blogSyncHandler],
      notionSyncStatusService
    ),
    listNotionSyncJobsUseCase: new ListNotionSyncJobsUseCase(notionSyncJobRepository),
    listNotionDataSourcePagesUseCase: new ListNotionDataSourcePagesUseCase(
      notionClient,
      notionModelDefinitionRepository,
      integrationConfigRepository,
      postRepository
    ),
    queryNotionModelUseCase: new QueryNotionModelUseCase(
      queryNotionModelDataService,
      integrationConfigRepository,
      notionModelDefinitionRepository
    ),
    retryNotionSyncJobUseCase: new RetryNotionSyncJobUseCase(notionSyncJobRepository, notionClient),
    getNotionModelSettingsUseCase,
    selectNotionModelSourceUseCase,
    getNotionSchemaMappingUseCase: new GetNotionSchemaMappingUseCase(
      notionClient,
      integrationConfigRepository,
      notionModelDefinitionRepository
    ),
    updateNotionSchemaMappingUseCase: new UpdateNotionSchemaMappingUseCase(
      integrationConfigRepository,
      notionModelDefinitionRepository
    ),
    listNotionModelDefinitionsUseCase: new ListNotionModelDefinitionsUseCase(
      notionModelDefinitionRepository
    ),
    createNotionModelDefinitionUseCase: new CreateNotionModelDefinitionUseCase(
      notionModelDefinitionRepository
    ),
    updateNotionModelDefinitionUseCase: new UpdateNotionModelDefinitionUseCase(
      notionModelDefinitionRepository
    ),
    addNotionModelFieldUseCase: new AddNotionModelFieldUseCase(
      notionModelDefinitionRepository
    ),
    updateNotionModelFieldUseCase: new UpdateNotionModelFieldUseCase(
      notionModelDefinitionRepository
    ),
    deleteNotionModelFieldUseCase: new DeleteNotionModelFieldUseCase(
      notionModelDefinitionRepository
    ),
    provisionNotionDatabaseUseCase: new ProvisionNotionDatabaseUseCase(
      notionClient,
      notionModelDefinitionRepository,
      env.notionSourcePageId
    ),
    migrateNotionSchemaUseCase: new MigrateNotionSchemaUseCase(
      notionClient,
      integrationConfigRepository,
      notionModelDefinitionRepository
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
