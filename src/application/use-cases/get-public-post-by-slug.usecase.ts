import { AppError } from "@/application/errors";
import type { PostRepository } from "@/domain/post/post-repository";
import type { Post } from "@/domain/post/post";

export class GetPublicPostBySlugUseCase {
  constructor(private readonly repository: PostRepository) {}

  async execute(slug: string): Promise<Post> {
    const post = await this.repository.findBySlug(slug);
    if (!post || post.status !== "published") {
      throw new AppError("POST_NOT_FOUND", "post not found");
    }

    return post;
  }
}
