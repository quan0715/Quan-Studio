import Link from "next/link";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent, CardTitle } from "@/presentation/components/ui/card";
import { PostCover, PostIcon } from "@/presentation/features/blog/post-visual";
import { formatIsoToUtcDate } from "@/presentation/lib/date-time";
import { serverApiRequest } from "@/presentation/lib/server-api-client";
import type { PostListItemDto } from "@/presentation/types/post";

export default async function BlogListPage() {
  const response = await serverApiRequest<PostListItemDto[]>("/api/public/posts");
  const posts = response.ok ? response.data : [];

  return (
    <section className="space-y-6">
      <Card>
        <CardContent className="space-y-3 p-6 md:p-8">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Engineering Notes</h1>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
            記錄系統設計、內容同步、前端架構與產品開發過程中的技術決策。
          </p>
        </CardContent>
      </Card>

      {posts.length ? posts.map((post) => (
        <Card key={post.slug} className="overflow-hidden border-border/70">
          <CardContent className="grid gap-4 p-4 md:grid-cols-[240px_minmax(0,1fr)] md:p-5">
            <PostCover post={post} className="h-40 md:h-full md:min-h-[170px]" />

            <div className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                  <PostIcon post={post} size="sm" />
                  <span>{post.title}</span>
                </CardTitle>
                <Badge variant="outline">{formatIsoToUtcDate(post.updatedAt)}</Badge>
              </div>

              {post.excerpt ? (
                <p className="text-sm leading-7 text-muted-foreground">{post.excerpt}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No excerpt yet.</p>
              )}

              {post.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {post.tags.map((tag) => (
                    <Badge key={`${post.id}-${tag}`} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : null}

              <Button asChild variant="outline" size="sm">
                <Link href={`/blog/${post.slug}`}>Read article</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )) : (
        <Card className="border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground">
            尚未有已發布文章，請先從 Notion 同步內容。
          </CardContent>
        </Card>
      )}
    </section>
  );
}
