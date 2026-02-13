import { AppError } from "@/application/errors";
import type { PostRepository } from "@/domain/post/post-repository";
import type { Post } from "@/domain/post/post";

export class GetStudioPostByNotionPageIdUseCase {
  constructor(private readonly repository: PostRepository) {}

  async execute(notionPageId: string): Promise<Post> {
    const normalized = notionPageId.trim();
    if (!normalized) {
      throw new AppError("VALIDATION_ERROR", "pageId is required");
    }

    const post = await this.repository.findByNotionPageId(normalized);
    if (!post) {
      throw new AppError("POST_NOT_FOUND", "post not found");
    }

    return post;
  }
}
