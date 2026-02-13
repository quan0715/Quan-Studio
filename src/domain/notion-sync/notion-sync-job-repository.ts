import type {
  NotionSyncJob,
  NotionSyncJobStatus,
  NotionSyncTrigger,
} from "@/domain/notion-sync/notion-sync-job";

export type EnqueueNotionSyncJobInput = {
  pageId: string;
  triggerType: NotionSyncTrigger;
  dedupeKey: string;
  payloadJson: Record<string, unknown> | null;
};

export interface NotionSyncJobRepository {
  enqueue(input: EnqueueNotionSyncJobInput): Promise<NotionSyncJob>;
  claimNext(lockId: string): Promise<NotionSyncJob | null>;
  markStatus(
    id: string,
    status: NotionSyncJobStatus,
    patch?: {
      attempt?: number;
      nextRunAt?: Date | null;
      errorMessage?: string | null;
      lockedAt?: Date | null;
      lockedBy?: string | null;
    }
  ): Promise<NotionSyncJob>;
  findById(id: string): Promise<NotionSyncJob | null>;
  listRecent(limit: number): Promise<NotionSyncJob[]>;
}
