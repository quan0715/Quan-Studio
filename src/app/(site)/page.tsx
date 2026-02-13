import { HomeLanding } from "@/presentation/features/home/home-landing";
import { serverApiRequest } from "@/presentation/lib/server-api-client";
import type { PostListItemDto } from "@/presentation/types/post";

export default async function HomePage() {
  const postsResponse = await serverApiRequest<PostListItemDto[]>("/api/public/posts");
  const latestPosts = postsResponse.ok ? postsResponse.data.slice(0, 3) : [];

  return <HomeLanding latestPosts={latestPosts} />;
}
