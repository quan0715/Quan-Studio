import { AppError } from "@/application/errors";
import type { NotionSyncJobRepository } from "@/domain/notion-sync/notion-sync-job-repository";
import { NotionClient } from "@/infrastructure/notion/notion-client";

type EnqueueNotionSyncJobInput = {
  pageId: string;
  triggerType: "button" | "manual" | "retry";
  payload: Record<string, unknown> | null;
  dedupeKey: string;
};

export class EnqueueNotionSyncJobUseCase {
  constructor(
    private readonly repository: NotionSyncJobRepository,
    private readonly notionClient: NotionClient
  ) {}

  async execute(input: EnqueueNotionSyncJobInput) {
    if (!input.pageId.trim()) {
      throw new AppError("VALIDATION_ERROR", "pageId is required");
    }
    if (!input.dedupeKey.trim()) {
      throw new AppError("VALIDATION_ERROR", "dedupeKey is required");
    }

    const normalizedPageId = input.pageId.trim();
    const job = await this.repository.enqueue({
      pageId: normalizedPageId,
      triggerType: input.triggerType,
      payloadJson: input.payload,
      dedupeKey: input.dedupeKey.trim(),
    });

    await this.syncStatusSafely(normalizedPageId, "IDLE");
    return job;
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
