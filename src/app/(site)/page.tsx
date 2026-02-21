import { HomeLanding } from "@/presentation/features/home/home-landing";
import { serverApiRequest } from "@/presentation/lib/server-api-client";
import type { PublicModelQueryResponse, TypedFieldValue } from "@/presentation/types/notion-model-query";
import type { PostListItemDto } from "@/presentation/types/post";
import type { ProjectResponse } from "@/presentation/types/project";
import type { SocialLink } from "@/presentation/features/home/home-landing";

export default async function HomePage() {
  const [postsResponse, projectsResponse, mediaLinksResponse] = await Promise.all([
    serverApiRequest<PostListItemDto[]>("/api/public/posts"),
    serverApiRequest<PublicModelQueryResponse>("/api/public/models/project?limit=100"),
    serverApiRequest<PublicModelQueryResponse>("/api/public/models/media-link?limit=100"),
  ]);

  const latestPosts = postsResponse.ok ? postsResponse.data.slice(0, 3) : [];
  const projects: ProjectResponse["items"] = projectsResponse.ok
    ? projectsResponse.data.rows.map((row) => ({
        key:
          (typeof row["__pageId"] === "string" && row["__pageId"].trim().length > 0
            ? row["__pageId"]
            : null) ??
          (readStringBySuffix(row, "name") ?? crypto.randomUUID()),
        name: readStringBySuffix(row, "name") ?? "Untitled Project",
        description: readStringBySuffix(row, "description"),
        tags: readStringArrayBySuffix(row, "tags"),
        githubUrl: readStringBySuffix(row, "githubUrl"),
        demoUrl: readStringBySuffix(row, "demoUrl"),
        thumbnail: readIconBySuffix(row, "thumbnail"),
      }))
    : [];
  const socialLinks: SocialLink[] = mediaLinksResponse.ok
    ? mediaLinksResponse.data.rows.map((row) => ({
        label: readStringBySuffix(row, "label") ?? "",
        url: readStringBySuffix(row, "url") ?? "",
        platform: readStringBySuffix(row, "platform") ?? "",
        logo: readIconBySuffix(row, "logo"),
      }))
    : [];

  return <HomeLanding latestPosts={latestPosts} projects={projects} socialLinks={socialLinks} />;
}

function readStringBySuffix(row: Record<string, TypedFieldValue>, suffix: string): string | null {
  for (const [key, value] of Object.entries(row)) {
    if (key.endsWith(`.${suffix}`) && typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}

function readStringArrayBySuffix(row: Record<string, TypedFieldValue>, suffix: string): string[] {
  for (const [key, value] of Object.entries(row)) {
    if (key.endsWith(`.${suffix}`) && Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    }
  }
  return [];
}

function readIconBySuffix(
  row: Record<string, TypedFieldValue>,
  suffix: string
): { emoji: string | null; url: string | null } | null {
  for (const [key, value] of Object.entries(row)) {
    if (key.endsWith(`.${suffix}`) && value && typeof value === "object" && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;
      if ("emoji" in record || "url" in record) {
        return {
          emoji: typeof record.emoji === "string" ? record.emoji : null,
          url: typeof record.url === "string" ? record.url : null,
        };
      }
    }
  }
  return null;
}
