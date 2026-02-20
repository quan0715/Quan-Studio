import { NotionSyncJobStatus as PrismaJobStatus, NotionSyncTrigger as PrismaTrigger, Prisma } from "@prisma/client";
import type {
  EnqueueNotionSyncJobInput,
  NotionSyncJobRepository,
} from "@/domain/notion-sync/notion-sync-job-repository";
import type {
  NotionSyncJob,
  NotionSyncJobStatus,
  NotionSyncTrigger,
} from "@/domain/notion-sync/notion-sync-job";
import { getPrismaClient } from "@/infrastructure/prisma/prisma-client";

export class PrismaNotionSyncJobRepository implements NotionSyncJobRepository {
  async enqueue(input: EnqueueNotionSyncJobInput): Promise<NotionSyncJob> {
    const created = await getPrismaClient().notionSyncJob.upsert({
      where: { dedupeKey: input.dedupeKey },
      update: {
        payloadJson: input.payloadJson as Prisma.InputJsonValue | undefined,
      },
      create: {
        pageId: input.pageId,
        triggerType: this.toPrismaTrigger(input.triggerType),
        status: PrismaJobStatus.pending,
        dedupeKey: input.dedupeKey,
        payloadJson: input.payloadJson as Prisma.InputJsonValue | undefined,
      },
    });

    return this.toDomain(created);
  }

  async findByDedupeKeys(dedupeKeys: string[]): Promise<NotionSyncJob[]> {
    if (!dedupeKeys.length) {
      return [];
    }

    const uniqueKeys = [...new Set(dedupeKeys)];
    const jobs = await getPrismaClient().notionSyncJob.findMany({
      where: {
        dedupeKey: {
          in: uniqueKeys,
        },
      },
    });

    return jobs.map((job) => this.toDomain(job));
  }

  async claimNext(lockId: string): Promise<NotionSyncJob | null> {
    const now = new Date();
    const job = await getPrismaClient().notionSyncJob.findFirst({
      where: {
        OR: [
          {
            status: PrismaJobStatus.pending,
            OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }],
          },
          {
            status: PrismaJobStatus.failed,
            nextRunAt: { lte: now },
          },
        ],
      },
      orderBy: [{ updatedAt: "asc" }],
    });

    if (!job) {
      return null;
    }

    const updated = await getPrismaClient().notionSyncJob.update({
      where: { id: job.id },
      data: {
        status: PrismaJobStatus.processing,
        lockedAt: now,
        lockedBy: lockId,
      },
    });

    return this.toDomain(updated);
  }

  async markStatus(
    id: string,
    status: NotionSyncJobStatus,
    patch?: {
      attempt?: number;
      nextRunAt?: Date | null;
      errorMessage?: string | null;
      lockedAt?: Date | null;
      lockedBy?: string | null;
    }
  ): Promise<NotionSyncJob> {
    const updated = await getPrismaClient().notionSyncJob.update({
      where: { id },
      data: {
        status: this.toPrismaStatus(status),
        attempt: patch?.attempt,
        nextRunAt: patch?.nextRunAt,
        errorMessage: patch?.errorMessage,
        lockedAt: patch?.lockedAt,
        lockedBy: patch?.lockedBy,
      },
    });
    return this.toDomain(updated);
  }

  async findById(id: string): Promise<NotionSyncJob | null> {
    const job = await getPrismaClient().notionSyncJob.findUnique({
      where: { id },
    });
    return job ? this.toDomain(job) : null;
  }

  async listRecent(limit: number): Promise<NotionSyncJob[]> {
    const jobs = await getPrismaClient().notionSyncJob.findMany({
      orderBy: [{ updatedAt: "desc" }],
      take: limit,
    });
    return jobs.map((job) => this.toDomain(job));
  }

  private toDomain(job: {
    id: string;
    pageId: string;
    triggerType: PrismaTrigger;
    status: PrismaJobStatus;
    attempt: number;
    maxAttempts: number;
    nextRunAt: Date | null;
    lockedAt: Date | null;
    lockedBy: string | null;
    payloadJson: Prisma.JsonValue | null;
    dedupeKey: string;
    errorMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): NotionSyncJob {
    return {
      id: job.id,
      pageId: job.pageId,
      triggerType: this.toDomainTrigger(job.triggerType),
      status: this.toDomainStatus(job.status),
      attempt: job.attempt,
      maxAttempts: job.maxAttempts,
      nextRunAt: job.nextRunAt,
      lockedAt: job.lockedAt,
      lockedBy: job.lockedBy,
      payloadJson:
        job.payloadJson && typeof job.payloadJson === "object" && !Array.isArray(job.payloadJson)
          ? (job.payloadJson as Record<string, unknown>)
          : null,
      dedupeKey: job.dedupeKey,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }

  private toPrismaStatus(status: NotionSyncJobStatus): PrismaJobStatus {
    switch (status) {
      case "pending":
        return PrismaJobStatus.pending;
      case "processing":
        return PrismaJobStatus.processing;
      case "succeeded":
        return PrismaJobStatus.succeeded;
      case "failed":
        return PrismaJobStatus.failed;
    }
  }

  private toDomainStatus(status: PrismaJobStatus): NotionSyncJobStatus {
    switch (status) {
      case PrismaJobStatus.pending:
        return "pending";
      case PrismaJobStatus.processing:
        return "processing";
      case PrismaJobStatus.succeeded:
        return "succeeded";
      case PrismaJobStatus.failed:
        return "failed";
    }
  }

  private toPrismaTrigger(trigger: NotionSyncTrigger): PrismaTrigger {
    switch (trigger) {
      case "button":
        return PrismaTrigger.button;
      case "manual":
        return PrismaTrigger.manual;
      case "retry":
        return PrismaTrigger.retry;
    }
  }

  private toDomainTrigger(trigger: PrismaTrigger): NotionSyncTrigger {
    switch (trigger) {
      case PrismaTrigger.button:
        return "button";
      case PrismaTrigger.manual:
        return "manual";
      case PrismaTrigger.retry:
        return "retry";
    }
  }
}
