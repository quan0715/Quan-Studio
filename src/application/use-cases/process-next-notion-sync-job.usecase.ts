import type { NotionModelSyncHandler } from "@/application/sync-handlers/notion-model-sync-handler";
import { NotionSyncStatusService } from "@/application/services/notion-sync-status.service";
import type { NotionSyncJobRepository } from "@/domain/notion-sync/notion-sync-job-repository";
import { NotionClient } from "@/infrastructure/notion/notion-client";

type ProcessNextNotionSyncJobOutput =
  | { ok: true; processed: false }
  | { ok: true; processed: true; pageId: string; entityId: string }
  | { ok: false; processed: true; pageId: string; error: string };

export class ProcessNextNotionSyncJobUseCase {
  private readonly handlerMap: Map<string, NotionModelSyncHandler>;

  constructor(
    private readonly syncJobRepository: NotionSyncJobRepository,
    notionClient: NotionClient,
    handlers: NotionModelSyncHandler[],
    private readonly notionSyncStatusService: NotionSyncStatusService = new NotionSyncStatusService(
      notionClient
    )
  ) {
    this.handlerMap = new Map(handlers.map((h) => [h.modelId, h]));
  }

  async execute(lockId: string): Promise<ProcessNextNotionSyncJobOutput> {
    const job = await this.syncJobRepository.claimNext(lockId);
    if (!job) {
      return { ok: true, processed: false };
    }

    const modelIdFromPayload = extractModelId(job.payloadJson);
    await this.notionSyncStatusService.setStatus({
      pageId: job.pageId,
      status: "Processing",
      modelId: modelIdFromPayload,
    });

    const handler = this.resolveHandler(job);
    const modelId = modelIdFromPayload ?? handler.modelId;

    try {
      const result = await handler.syncPage(job.pageId);
      await this.syncJobRepository.markStatus(job.id, "succeeded", {
        attempt: job.attempt + 1,
        errorMessage: null,
        nextRunAt: null,
        lockedAt: null,
        lockedBy: null,
      });
      await this.notionSyncStatusService.setStatus({
        pageId: job.pageId,
        status: "Success",
        modelId,
      });

      return { ok: true, processed: true, pageId: job.pageId, entityId: result.entityId };
    } catch (error) {
      const attempt = job.attempt + 1;
      const waitMs = Math.min(60_000, 1_000 * 2 ** Math.max(0, job.attempt));
      const nextRunAt = attempt >= job.maxAttempts ? null : new Date(Date.now() + waitMs);
      await this.syncJobRepository.markStatus(job.id, "failed", {
        attempt,
        errorMessage: stringifyError(error),
        nextRunAt,
        lockedAt: null,
        lockedBy: null,
      });
      await this.notionSyncStatusService.setStatus({
        pageId: job.pageId,
        status: "Failed",
        modelId,
      });
      return { ok: false, processed: true, pageId: job.pageId, error: stringifyError(error) };
    }
  }

  async executePage(
    pageId: string,
    modelId?: string
  ): Promise<{ ok: true; pageId: string; entityId: string } | { ok: false; pageId: string; error: string }> {
    const normalizedPageId = pageId.trim();
    if (!normalizedPageId) {
      return { ok: false, pageId: "", error: "pageId is required" };
    }

    const handler = modelId
      ? this.handlerMap.get(modelId)
      : this.handlerMap.values().next().value;

    if (!handler) {
      return { ok: false, pageId: normalizedPageId, error: `no sync handler found${modelId ? ` for model: ${modelId}` : ""}` };
    }

    await this.notionSyncStatusService.setStatus({
      pageId: normalizedPageId,
      status: "Processing",
      modelId,
    });

    try {
      const result = await handler.syncPage(normalizedPageId);
      await this.notionSyncStatusService.setStatus({
        pageId: normalizedPageId,
        status: "Success",
        modelId: handler.modelId,
      });
      return { ok: true, pageId: normalizedPageId, entityId: result.entityId };
    } catch (error) {
      await this.notionSyncStatusService.setStatus({
        pageId: normalizedPageId,
        status: "Failed",
        modelId: handler.modelId,
      });
      return {
        ok: false,
        pageId: normalizedPageId,
        error: stringifyError(error),
      };
    }
  }

  private resolveHandler(job: { payloadJson?: unknown }): NotionModelSyncHandler {
    // Try to extract modelId from job payload
    if (job.payloadJson && typeof job.payloadJson === "object" && job.payloadJson !== null) {
      const payload = job.payloadJson as Record<string, unknown>;
      if (typeof payload.modelId === "string" && this.handlerMap.has(payload.modelId)) {
        return this.handlerMap.get(payload.modelId)!;
      }
    }

    // Default to first registered handler (blog) for backward compatibility
    const first = this.handlerMap.values().next().value;
    if (!first) {
      throw new Error("no sync handlers registered");
    }
    return first;
  }

}

function stringifyError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "unknown error";
}

function extractModelId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const modelId = (payload as { modelId?: unknown }).modelId;
  return typeof modelId === "string" && modelId.trim().length > 0 ? modelId.trim() : undefined;
}
