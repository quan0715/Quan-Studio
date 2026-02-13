import { AppError } from "@/application/errors";
import type { NotionSyncJobRepository } from "@/domain/notion-sync/notion-sync-job-repository";

type EnqueueNotionSyncJobInput = {
  pageId: string;
  triggerType: "button" | "manual" | "retry";
  payload: Record<string, unknown> | null;
  dedupeKey: string;
};

export class EnqueueNotionSyncJobUseCase {
  constructor(private readonly repository: NotionSyncJobRepository) {}

  async execute(input: EnqueueNotionSyncJobInput) {
    if (!input.pageId.trim()) {
      throw new AppError("VALIDATION_ERROR", "pageId is required");
    }
    if (!input.dedupeKey.trim()) {
      throw new AppError("VALIDATION_ERROR", "dedupeKey is required");
    }

    return this.repository.enqueue({
      pageId: input.pageId.trim(),
      triggerType: input.triggerType,
      payloadJson: input.payload,
      dedupeKey: input.dedupeKey.trim(),
    });
  }
}
