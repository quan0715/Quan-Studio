import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EnqueuePublishedNotionSyncJobsUseCase } from "@/application/use-cases/enqueue-published-notion-sync-jobs.usecase";
import type {
  EnqueueNotionSyncJobInput,
  NotionSyncJobRepository,
} from "@/domain/notion-sync/notion-sync-job-repository";
import type { NotionSyncJob } from "@/domain/notion-sync/notion-sync-job";
import type { Post } from "@/domain/post/post";
import type { PostRepository } from "@/domain/post/post-repository";

class InMemoryPostRepository implements PostRepository {
  constructor(private readonly posts: Post[]) {}

  async upsertByNotionPageId(post: Post): Promise<Post> {
    return post;
  }

  async findByNotionPageId(notionPageId: string): Promise<Post | null> {
    return this.posts.find((post) => post.notionPageId === notionPageId) ?? null;
  }

  async findBySlug(slug: string): Promise<Post | null> {
    return this.posts.find((post) => post.slug === slug) ?? null;
  }

  async listAll(): Promise<Post[]> {
    return this.posts;
  }

  async listPublished(): Promise<Post[]> {
    return this.posts.filter((post) => post.status === "published");
  }
}

class InMemoryNotionSyncJobRepository implements NotionSyncJobRepository {
  private readonly jobByDedupeKey = new Map<string, NotionSyncJob>();

  async enqueue(input: EnqueueNotionSyncJobInput): Promise<NotionSyncJob> {
    const existing = this.jobByDedupeKey.get(input.dedupeKey);
    if (existing) {
      return existing;
    }

    const now = new Date();
    const created: NotionSyncJob = {
      id: `job-${this.jobByDedupeKey.size + 1}`,
      pageId: input.pageId,
      triggerType: input.triggerType,
      status: "pending",
      attempt: 0,
      maxAttempts: 5,
      nextRunAt: null,
      lockedAt: null,
      lockedBy: null,
      payloadJson: input.payloadJson,
      dedupeKey: input.dedupeKey,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
    };
    this.jobByDedupeKey.set(input.dedupeKey, created);
    return created;
  }

  async findByDedupeKeys(dedupeKeys: string[]): Promise<NotionSyncJob[]> {
    return dedupeKeys
      .map((key) => this.jobByDedupeKey.get(key))
      .filter((job): job is NotionSyncJob => Boolean(job));
  }

  async claimNext(lockId: string): Promise<NotionSyncJob | null> {
    void lockId;
    return null;
  }

  async markStatus(
    id: string,
    status: NotionSyncJob["status"],
    patch?: {
      attempt?: number;
      nextRunAt?: Date | null;
      errorMessage?: string | null;
      lockedAt?: Date | null;
      lockedBy?: string | null;
    }
  ): Promise<NotionSyncJob> {
    void id;
    void status;
    void patch;
    throw new Error("not implemented");
  }

  async findById(id: string): Promise<NotionSyncJob | null> {
    void id;
    return null;
  }

  async listRecent(limit: number): Promise<NotionSyncJob[]> {
    void limit;
    return [...this.jobByDedupeKey.values()];
  }
}

describe("EnqueuePublishedNotionSyncJobsUseCase", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("enqueues all published pages and skips draft pages", async () => {
    vi.setSystemTime(new Date("2026-02-20T10:15:00.000Z"));
    const postRepository = new InMemoryPostRepository([
      createPost({ notionPageId: "page-a", slug: "a", status: "published" }),
      createPost({ notionPageId: "page-b", slug: "b", status: "published" }),
      createPost({ notionPageId: "page-c", slug: "c", status: "draft" }),
    ]);
    const syncJobRepository = new InMemoryNotionSyncJobRepository();
    const useCase = new EnqueuePublishedNotionSyncJobsUseCase(postRepository, syncJobRepository);

    const result = await useCase.execute();
    const jobs = await syncJobRepository.listRecent(20);

    expect(result).toMatchObject({
      totalPublished: 2,
      enqueued: 2,
      skipped: 0,
    });
    expect(result.errors).toHaveLength(0);
    expect(jobs.map((job) => job.dedupeKey).sort()).toEqual([
      "scheduled:page-a:2026022010",
      "scheduled:page-b:2026022010",
    ]);
  });

  it("does not enqueue duplicated pages in the same hour slot", async () => {
    vi.setSystemTime(new Date("2026-02-20T10:20:00.000Z"));
    const postRepository = new InMemoryPostRepository([
      createPost({ notionPageId: "page-a", slug: "a", status: "published" }),
    ]);
    const syncJobRepository = new InMemoryNotionSyncJobRepository();
    const useCase = new EnqueuePublishedNotionSyncJobsUseCase(postRepository, syncJobRepository);

    const first = await useCase.execute();
    const second = await useCase.execute();

    expect(first.enqueued).toBe(1);
    expect(first.skipped).toBe(0);
    expect(second.enqueued).toBe(0);
    expect(second.skipped).toBe(1);
  });

  it("returns zero counts when no published post exists", async () => {
    vi.setSystemTime(new Date("2026-02-20T10:20:00.000Z"));
    const postRepository = new InMemoryPostRepository([
      createPost({ notionPageId: "page-draft", slug: "draft", status: "draft" }),
    ]);
    const syncJobRepository = new InMemoryNotionSyncJobRepository();
    const useCase = new EnqueuePublishedNotionSyncJobsUseCase(postRepository, syncJobRepository);

    const result = await useCase.execute();

    expect(result).toEqual({
      totalPublished: 0,
      enqueued: 0,
      skipped: 0,
      errors: [],
    });
  });
});

function createPost(overrides: Partial<Post>): Post {
  const now = new Date("2026-02-20T00:00:00.000Z");

  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: overrides.title ?? "title",
    slug: overrides.slug ?? "slug",
    excerpt: overrides.excerpt ?? null,
    tags: overrides.tags ?? [],
    status: overrides.status ?? "draft",
    contentJson: overrides.contentJson ?? {},
    coverUrl: overrides.coverUrl ?? null,
    publishedAt: overrides.publishedAt ?? (overrides.status === "published" ? now : null),
    notionPageId: overrides.notionPageId ?? "page-id",
    notionLastEditedAt: overrides.notionLastEditedAt ?? now,
    syncedAt: overrides.syncedAt ?? now,
    syncError: overrides.syncError ?? null,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}
