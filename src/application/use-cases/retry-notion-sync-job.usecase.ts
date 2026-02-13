import { AppError } from "@/application/errors";
import type { NotionSyncJobRepository } from "@/domain/notion-sync/notion-sync-job-repository";

export class RetryNotionSyncJobUseCase {
  constructor(private readonly repository: NotionSyncJobRepository) {}

  async execute(id: string) {
    const job = await this.repository.findById(id);
    if (!job) {
      throw new AppError("SYNC_JOB_NOT_FOUND", "sync job not found");
    }

    return this.repository.markStatus(id, "pending", {
      errorMessage: null,
      nextRunAt: new Date(),
      lockedAt: null,
      lockedBy: null,
    });
  }
}
