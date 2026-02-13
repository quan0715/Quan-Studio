import type { NotionSyncJob } from "@/domain/notion-sync/notion-sync-job";

export function toNotionSyncJobDto(job: NotionSyncJob) {
  return {
    id: job.id,
    pageId: job.pageId,
    triggerType: job.triggerType,
    status: job.status,
    attempt: job.attempt,
    maxAttempts: job.maxAttempts,
    nextRunAt: job.nextRunAt ? job.nextRunAt.toISOString() : null,
    lockedAt: job.lockedAt ? job.lockedAt.toISOString() : null,
    lockedBy: job.lockedBy,
    errorMessage: job.errorMessage,
    dedupeKey: job.dedupeKey,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}
