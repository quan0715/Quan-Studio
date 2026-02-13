export type NotionSyncJobStatus = "pending" | "processing" | "succeeded" | "failed";
export type NotionSyncTrigger = "button" | "manual" | "retry";

export type NotionSyncJob = {
  id: string;
  pageId: string;
  triggerType: NotionSyncTrigger;
  status: NotionSyncJobStatus;
  attempt: number;
  maxAttempts: number;
  nextRunAt: Date | null;
  lockedAt: Date | null;
  lockedBy: string | null;
  payloadJson: Record<string, unknown> | null;
  dedupeKey: string;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};
