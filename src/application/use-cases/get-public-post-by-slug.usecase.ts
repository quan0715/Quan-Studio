import { AppError } from "@/application/errors";
import type { PublicPostDataGateway } from "@/domain/post/public-post-data-gateway";
import type { Post } from "@/domain/post/post";

export class GetPublicPostBySlugUseCase {
  constructor(private readonly publicPostDataGateway: PublicPostDataGateway) {}

  async execute(slug: string): Promise<Post> {
    const post = await this.publicPostDataGateway.findPublishedBySlug(slug);
    if (!post) {
      throw new AppError("POST_NOT_FOUND", "post not found");
    }

    return post;
  }
}
