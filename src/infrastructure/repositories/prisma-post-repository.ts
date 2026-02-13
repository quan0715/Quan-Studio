import { PostStatus as PrismaPostStatus, Prisma, type Post as PrismaPost } from "@prisma/client";
import type { PostRepository } from "@/domain/post/post-repository";
import type { Post } from "@/domain/post/post";
import { getPrismaClient } from "@/infrastructure/prisma/prisma-client";

export class PrismaPostRepository implements PostRepository {
  async upsertByNotionPageId(post: Post): Promise<Post> {
    const upserted = await getPrismaClient().post.upsert({
      where: { notionPageId: post.notionPageId },
      update: this.toUpsertInput(post),
      create: this.toUpsertInput(post),
    });

    return this.toDomainPost(upserted);
  }

  async findByNotionPageId(notionPageId: string): Promise<Post | null> {
    const post = await getPrismaClient().post.findUnique({
      where: { notionPageId },
    });
    return post ? this.toDomainPost(post) : null;
  }

  async findBySlug(slug: string): Promise<Post | null> {
    const post = await getPrismaClient().post.findUnique({
      where: { slug },
    });
    return post ? this.toDomainPost(post) : null;
  }

  async listAll(): Promise<Post[]> {
    const posts = await getPrismaClient().post.findMany({
      orderBy: [{ updatedAt: "desc" }],
    });
    return posts.map((post) => this.toDomainPost(post));
  }

  async listPublished(): Promise<Post[]> {
    const posts = await getPrismaClient().post.findMany({
      where: { status: PrismaPostStatus.published },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    });
    return posts.map((post) => this.toDomainPost(post));
  }

  private toDomainPost(post: PrismaPost): Post {
    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      tags: post.tags,
      status: this.toDomainStatus(post.status),
      contentJson: this.toJsonObject(post.contentJson),
      coverUrl: post.coverUrl,
      publishedAt: post.publishedAt,
      notionPageId: post.notionPageId,
      notionLastEditedAt: post.notionLastEditedAt,
      syncedAt: post.syncedAt,
      syncError: post.syncError,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }

  private toUpsertInput(post: Post): Prisma.PostUncheckedCreateInput {
    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      tags: post.tags,
      status: this.toPrismaStatus(post.status),
      contentJson: post.contentJson as Prisma.InputJsonValue,
      coverUrl: post.coverUrl,
      publishedAt: post.publishedAt,
      notionPageId: post.notionPageId,
      notionLastEditedAt: post.notionLastEditedAt,
      syncedAt: post.syncedAt,
      syncError: post.syncError,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }

  private toDomainStatus(status: PrismaPostStatus): Post["status"] {
    return status === PrismaPostStatus.published ? "published" : "draft";
  }

  private toPrismaStatus(status: Post["status"]): PrismaPostStatus {
    return status === "published" ? PrismaPostStatus.published : PrismaPostStatus.draft;
  }

  private toJsonObject(value: Prisma.JsonValue): Record<string, unknown> {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }
}
