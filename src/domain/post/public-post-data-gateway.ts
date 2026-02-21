import type { Post } from "@/domain/post/post";

export interface PublicPostDataGateway {
  listPublished(): Promise<Post[]>;
  findPublishedBySlug(slug: string): Promise<Post | null>;
}

