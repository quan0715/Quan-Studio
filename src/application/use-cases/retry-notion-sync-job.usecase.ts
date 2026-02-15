import { AppError } from "@/application/errors";
import type { NotionSyncJobRepository } from "@/domain/notion-sync/notion-sync-job-repository";
import { NotionClient } from "@/infrastructure/notion/notion-client";

export class RetryNotionSyncJobUseCase {
  constructor(
    private readonly repository: NotionSyncJobRepository,
    private readonly notionClient: NotionClient
  ) {}

  async execute(id: string) {
    const job = await this.repository.findById(id);
    if (!job) {
      throw new AppError("SYNC_JOB_NOT_FOUND", "sync job not found");
    }

    const updated = await this.repository.markStatus(id, "pending", {
      errorMessage: null,
      nextRunAt: new Date(),
      lockedAt: null,
      lockedBy: null,
    });

    await this.syncStatusSafely(job.pageId, "IDLE");
    return updated;
  }

  private async syncStatusSafely(pageId: string, status: "IDLE"): Promise<void> {
    try {
      await this.notionClient.updatePageSyncStatus(pageId, status);
    } catch (error) {
      console.warn("[notion-sync] failed to update Sync Status", {
        pageId,
        status,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
