import type { NotionSyncJobRepository } from "@/domain/notion-sync/notion-sync-job-repository";

export class ListNotionSyncJobsUseCase {
  constructor(private readonly repository: NotionSyncJobRepository) {}

  async execute(limit = 50) {
    return this.repository.listRecent(limit);
  }
}
