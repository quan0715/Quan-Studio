import { HomeLanding } from "@/presentation/features/home/home-landing";
import { serverApiRequest } from "@/presentation/lib/server-api-client";
import type { PublicMediaLinkDto } from "@/presentation/types/media-link";
import type { PostListItemDto } from "@/presentation/types/post";
import type { ProjectResponse } from "@/presentation/types/project";

export default async function HomePage() {
  const [postsResponse, projectsResponse, mediaLinksResponse] = await Promise.all([
    serverApiRequest<PostListItemDto[]>("/api/public/posts"),
    serverApiRequest<ProjectResponse>("/api/public/projects?limit=100"),
    serverApiRequest<PublicMediaLinkDto[]>("/api/public/media-links?limit=8"),
  ]);

  const latestPosts = postsResponse.ok ? postsResponse.data.slice(0, 1) : [];
  const projects = projectsResponse.ok ? projectsResponse.data.items : [];
  const socialLinks = mediaLinksResponse.ok ? mediaLinksResponse.data : [];

  return <HomeLanding latestPosts={latestPosts} projects={projects} socialLinks={socialLinks} />;
}
