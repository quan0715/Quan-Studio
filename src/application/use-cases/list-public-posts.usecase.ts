import type { PublicPostDataGateway } from "@/domain/post/public-post-data-gateway";
import type { Post } from "@/domain/post/post";

export class ListPublicPostsUseCase {
  constructor(private readonly publicPostDataGateway: PublicPostDataGateway) {}

  async execute(): Promise<Post[]> {
    const posts = await this.publicPostDataGateway.listPublished();

    return [...posts].sort((a, b) => {
      const aTime = (a.publishedAt ?? a.updatedAt).getTime();
      const bTime = (b.publishedAt ?? b.updatedAt).getTime();
      return bTime - aTime;
    });
  }
}
