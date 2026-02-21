import type { PublicPostDataGateway } from "@/domain/post/public-post-data-gateway";
import type { Post } from "@/domain/post/post";
import type { PostRepository } from "@/domain/post/post-repository";

export class PostRepositoryPublicPostGateway implements PublicPostDataGateway {
  constructor(private readonly postRepository: PostRepository) {}

  async listPublished(): Promise<Post[]> {
    return this.postRepository.listPublished();
  }

  async findPublishedBySlug(slug: string): Promise<Post | null> {
    const post = await this.postRepository.findBySlug(slug);
    if (!post || post.status !== "published") {
      return null;
    }
    return post;
  }
}

