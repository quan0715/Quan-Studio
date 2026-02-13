import { EnqueueNotionSyncJobUseCase } from "@/application/use-cases/enqueue-notion-sync-job.usecase";
import { GetPublicPostBySlugUseCase } from "@/application/use-cases/get-public-post-by-slug.usecase";
import { GetStudioPostByNotionPageIdUseCase } from "@/application/use-cases/get-studio-post-by-notion-page-id.usecase";
import { ListPublicPostsUseCase } from "@/application/use-cases/list-public-posts.usecase";
import { ListNotionDataSourcePagesUseCase } from "@/application/use-cases/list-notion-data-source-pages.usecase";
import { ListNotionResumeDataSourceUseCase } from "@/application/use-cases/list-notion-resume-data-source.usecase";
import { ListNotionSyncJobsUseCase } from "@/application/use-cases/list-notion-sync-jobs.usecase";
import { ListStudioPostsUseCase } from "@/application/use-cases/list-studio-posts.usecase";
import {
  GetStudioNotionSettingsUseCase,
  TestStudioNotionSettingsUseCase,
  UpdateStudioNotionSettingsUseCase,
} from "@/application/use-cases/manage-studio-notion-settings.usecase";
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
  processNextNotionSyncJobUseCase: ProcessNextNotionSyncJobUseCase;
  listNotionSyncJobsUseCase: ListNotionSyncJobsUseCase;
  listNotionDataSourcePagesUseCase: ListNotionDataSourcePagesUseCase;
  listNotionResumeDataSourceUseCase: ListNotionResumeDataSourceUseCase;
  retryNotionSyncJobUseCase: RetryNotionSyncJobUseCase;
  getStudioNotionSettingsUseCase: GetStudioNotionSettingsUseCase;
  updateStudioNotionSettingsUseCase: UpdateStudioNotionSettingsUseCase;
  testStudioNotionSettingsUseCase: TestStudioNotionSettingsUseCase;
};

declare global {
  var __quanStudioContainer: Container | undefined;
}

export function getContainer(): Container {
  if (!isContainerInitialized(globalThis.__quanStudioContainer)) {
    const postRepository = new PrismaPostRepository();
    const notionSyncJobRepository = new PrismaNotionSyncJobRepository();
    const integrationConfigRepository = new PrismaIntegrationConfigRepository();
    const notionClient = new NotionClient();
    const getStudioNotionSettingsUseCase = new GetStudioNotionSettingsUseCase(
      integrationConfigRepository
    );
    const updateStudioNotionSettingsUseCase = new UpdateStudioNotionSettingsUseCase(
      integrationConfigRepository
    );
    const testStudioNotionSettingsUseCase = new TestStudioNotionSettingsUseCase(
      notionClient,
      getStudioNotionSettingsUseCase
    );

    globalThis.__quanStudioContainer = {
      listStudioPostsUseCase: new ListStudioPostsUseCase(postRepository),
      getStudioPostByNotionPageIdUseCase: new GetStudioPostByNotionPageIdUseCase(postRepository),
      listPublicPostsUseCase: new ListPublicPostsUseCase(postRepository),
      getPublicPostBySlugUseCase: new GetPublicPostBySlugUseCase(postRepository),
      enqueueNotionSyncJobUseCase: new EnqueueNotionSyncJobUseCase(notionSyncJobRepository),
      processNextNotionSyncJobUseCase: new ProcessNextNotionSyncJobUseCase(
        notionSyncJobRepository,
        postRepository,
        notionClient
      ),
      listNotionSyncJobsUseCase: new ListNotionSyncJobsUseCase(notionSyncJobRepository),
      listNotionDataSourcePagesUseCase: new ListNotionDataSourcePagesUseCase(
        notionClient,
        integrationConfigRepository
      ),
      listNotionResumeDataSourceUseCase: new ListNotionResumeDataSourceUseCase(
        notionClient,
        integrationConfigRepository
      ),
      retryNotionSyncJobUseCase: new RetryNotionSyncJobUseCase(notionSyncJobRepository),
      getStudioNotionSettingsUseCase,
      updateStudioNotionSettingsUseCase,
      testStudioNotionSettingsUseCase,
    };
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
      container.processNextNotionSyncJobUseCase &&
      container.listNotionSyncJobsUseCase &&
      container.listNotionDataSourcePagesUseCase &&
      container.listNotionResumeDataSourceUseCase &&
      container.retryNotionSyncJobUseCase &&
      container.getStudioNotionSettingsUseCase &&
      container.updateStudioNotionSettingsUseCase &&
      container.testStudioNotionSettingsUseCase
  );
}
