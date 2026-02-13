import type { PostRepository } from "@/domain/post/post-repository";
import type { Post } from "@/domain/post/post";

export class ListStudioPostsUseCase {
  constructor(private readonly repository: PostRepository) {}

  async execute(): Promise<Post[]> {
    const posts = await this.repository.listAll();

    return [...posts].sort((a, b) => {
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
  }
}
