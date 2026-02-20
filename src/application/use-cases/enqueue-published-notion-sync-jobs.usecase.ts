import type { NotionSyncJobRepository } from "@/domain/notion-sync/notion-sync-job-repository";
import type { PostRepository } from "@/domain/post/post-repository";

export type EnqueuePublishedNotionSyncJobsOutput = {
  totalPublished: number;
  enqueued: number;
  skipped: number;
  errors: Array<{
    pageId: string;
    message: string;
  }>;
};

export class EnqueuePublishedNotionSyncJobsUseCase {
  constructor(
    private readonly postRepository: PostRepository,
    private readonly syncJobRepository: NotionSyncJobRepository
  ) {}

  async execute(now = new Date()): Promise<EnqueuePublishedNotionSyncJobsOutput> {
    const publishedPosts = await this.postRepository.listPublished();
    const pageIds = publishedPosts
      .map((post) => post.notionPageId.trim())
      .filter((pageId) => pageId.length > 0);
    const slotKey = toUtcHourSlot(now);

    const dedupeKeyByPageId = new Map<string, string>();
    for (const pageId of pageIds) {
      dedupeKeyByPageId.set(pageId, `scheduled:${pageId}:${slotKey}`);
    }

    const existingJobs = await this.syncJobRepository.findByDedupeKeys([
      ...dedupeKeyByPageId.values(),
    ]);
    const existingDedupeKeys = new Set(existingJobs.map((job) => job.dedupeKey));

    let enqueued = 0;
    let skipped = 0;
    const errors: Array<{ pageId: string; message: string }> = [];

    for (const pageId of pageIds) {
      const dedupeKey = dedupeKeyByPageId.get(pageId);
      if (!dedupeKey) {
        skipped += 1;
        continue;
      }

      if (existingDedupeKeys.has(dedupeKey)) {
        skipped += 1;
        continue;
      }

      try {
        await this.syncJobRepository.enqueue({
          pageId,
          triggerType: "manual",
          dedupeKey,
          payloadJson: null,
        });
        enqueued += 1;
      } catch (error) {
        errors.push({
          pageId,
          message: stringifyError(error),
        });
      }
    }

    return {
      totalPublished: pageIds.length,
      enqueued,
      skipped,
      errors,
    };
  }
}

function stringifyError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "unknown error";
}

function toUtcHourSlot(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");

  return `${year}${month}${day}${hour}`;
}
