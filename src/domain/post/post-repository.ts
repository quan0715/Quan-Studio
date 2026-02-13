import type { Post } from "@/domain/post/post";

export interface PostRepository {
  upsertByNotionPageId(post: Post): Promise<Post>;
  findByNotionPageId(notionPageId: string): Promise<Post | null>;
  findBySlug(slug: string): Promise<Post | null>;
  listAll(): Promise<Post[]>;
  listPublished(): Promise<Post[]>;
}
