import { NotionDataSourcePagesTable } from "@/presentation/features/notion-sync/notion-data-source-pages-table";
import { PostListTable } from "@/presentation/features/post-list/post-list-table";
import { serverApiRequest } from "@/presentation/lib/server-api-client";
import type { NotionDataSourcePageDto } from "@/presentation/types/notion-sync";
import type { PostListItemDto } from "@/presentation/types/post";

export default async function StudioPostsPage() {
  const [postsResponse, notionPagesResponse] = await Promise.all([
    serverApiRequest<PostListItemDto[]>("/api/studio/posts"),
    serverApiRequest<NotionDataSourcePageDto[]>("/api/studio/notion/articles?limit=50"),
  ]);

  const posts = postsResponse.ok ? postsResponse.data : [];
  const notionPages = notionPagesResponse.ok ? notionPagesResponse.data : [];

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Studio Monitor</h1>
        <p className="text-muted-foreground text-xs">
          Monitor synced Notion pages and local post records. Queue actions are moved to Sync Queue page.
        </p>
      </div>

      <NotionDataSourcePagesTable pages={notionPages} />
      <PostListTable posts={posts} />
    </section>
  );
}
