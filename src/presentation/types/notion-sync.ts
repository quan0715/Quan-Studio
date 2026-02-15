export type NotionSyncJobStatus = "pending" | "processing" | "succeeded" | "failed";

export type NotionSyncJobDto = {
  id: string;
  pageId: string;
  triggerType: "button" | "manual" | "retry";
  status: NotionSyncJobStatus;
  attempt: number;
  maxAttempts: number;
  nextRunAt: string | null;
  lockedAt: string | null;
  lockedBy: string | null;
  errorMessage: string | null;
  dedupeKey: string;
  createdAt: string;
  updatedAt: string;
};

export type ProcessNextNotionSyncJobResponse =
  | { ok: true; processed: false }
  | { ok: true; processed: true; pageId: string; postId: string }
  | { ok: false; processed: true; pageId: string; error: string };

export type NotionDataSourcePageDto = {
  pageId: string;
  url: string;
  title: string;
  slug: string | null;
  status: string | null;
  tags: string[];
  lastEditedTime: string;
  lastSyncedAt: string | null;
  lastSyncedNotionEditedTime: string | null;
  requiresSync: boolean;
  websiteUrl: string | null;
};
