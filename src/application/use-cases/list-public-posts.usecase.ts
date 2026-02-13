import type { PostRepository } from "@/domain/post/post-repository";
import type { Post } from "@/domain/post/post";

export class ListPublicPostsUseCase {
  constructor(private readonly repository: PostRepository) {}

  async execute(): Promise<Post[]> {
    const posts = await this.repository.listPublished();

    return [...posts].sort((a, b) => {
      const aTime = (a.publishedAt ?? a.updatedAt).getTime();
      const bTime = (b.publishedAt ?? b.updatedAt).getTime();
      return bTime - aTime;
    });
  }
}
