import { AppError } from "@/application/errors";
import { NotionSyncStatusService } from "@/application/services/notion-sync-status.service";
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
    notionClient: NotionClient,
    private readonly notionSyncStatusService: NotionSyncStatusService = new NotionSyncStatusService(
      notionClient
    )
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

    const modelId = extractModelId(input.payload);
    await this.notionSyncStatusService.setStatus({
      pageId: normalizedPageId,
      status: "IDLE",
      modelId,
    });
    return job;
  }
}

function extractModelId(payload: Record<string, unknown> | null): string | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }
  const value = payload.modelId;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}
