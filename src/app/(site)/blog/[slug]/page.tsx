import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import { PostCover, PostIcon } from "@/presentation/features/blog/post-visual";
import { PostContentRenderer } from "@/presentation/features/post-renderer/post-content-renderer";
import { formatIsoToUtcDate } from "@/presentation/lib/date-time";
import { serverApiRequest } from "@/presentation/lib/server-api-client";
import type { PostDetailDto } from "@/presentation/types/post";

type TocItem = {
  id: string;
  title: string;
  level: 1 | 2 | 3;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const response = await serverApiRequest<PostDetailDto>(`/api/public/posts/${encodeURIComponent(slug)}`);

  if (!response.ok) {
    return {
      title: "Post Not Found | Quan Studio",
      description: "The requested post does not exist.",
    };
  }
  const post = response.data;

  return {
    title: `${post.title} | Quan Studio`,
    description: post.excerpt ?? "Published article from Quan Studio.",
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toAnchorSafeId(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  return normalized.length > 0 ? normalized : "untitled";
}

function resolveHeadingId(block: Record<string, unknown>, fallback: string): string {
  const raw = typeof block.id === "string" && block.id.trim().length > 0 ? block.id : fallback;
  return `h-${toAnchorSafeId(raw)}`;
}

function richTextToPlain(value: unknown): string {
  if (!Array.isArray(value)) {
    return "";
  }

  return value
    .map((item) => {
      if (!isPlainObject(item)) {
        return "";
      }

      const plainText = item.plain_text;
      return typeof plainText === "string" ? plainText : "";
    })
    .join("")
    .trim();
}

function toBlocks(document: Record<string, unknown>): Record<string, unknown>[] {
  if (Array.isArray(document.results)) {
    return document.results.filter(isPlainObject);
  }
  if (Array.isArray(document.blocks)) {
    return document.blocks.filter(isPlainObject);
  }
  if (Array.isArray(document.children)) {
    return document.children.filter(isPlainObject);
  }
  return [];
}

function collectTocItems(blocks: Record<string, unknown>[], list: TocItem[]): void {
  blocks.forEach((block, index) => {
    const type = typeof block.type === "string" ? block.type : "";
    const headingLevel =
      type === "heading_1" ? 1 :
      type === "heading_2" ? 2 :
      type === "heading_3" ? 3 :
      null;

    if (headingLevel) {
      const data = isPlainObject(block[type]) ? block[type] as Record<string, unknown> : {};
      const title = richTextToPlain(data.rich_text);
      if (title) {
        list.push({
          id: resolveHeadingId(block, `${type}-${index}`),
          title,
          level: headingLevel,
        });
      }
    }

    if (!type) {
      return;
    }

    const data = isPlainObject(block[type]) ? block[type] as Record<string, unknown> : null;
    if (!data || !Array.isArray(data.children)) {
      return;
    }

    const children = data.children.filter(isPlainObject);
    if (!children.length) {
      return;
    }

    collectTocItems(children, list);
  });
}

function extractTableOfContents(document: Record<string, unknown>): TocItem[] {
  const rootBlocks = toBlocks(document);
  const items: TocItem[] = [];
  collectTocItems(rootBlocks, items);
  return items;
}

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const response = await serverApiRequest<PostDetailDto>(`/api/public/posts/${encodeURIComponent(slug)}`);

  if (!response.ok) {
    notFound();
  }
  const post = response.data;
  const tocItems = extractTableOfContents(post.contentJson);

  return (
    <section className="space-y-4 md:space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card className="overflow-hidden">
          <div className="relative h-[230px] sm:h-[260px] md:h-[380px]">
            <PostCover
              post={post}
              className="h-full rounded-none border-x-0 border-t-0"
              imageClassName="object-cover"
              showFallbackTitle={false}
              showFallbackIcon={false}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5 md:p-6">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/20">
                  Blog
                </Badge>
                <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/20">
                  {formatIsoToUtcDate(post.updatedAt)}
                </Badge>
                <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/20">
                  {post.status}
                </Badge>
                {post.tags.map((tag) => (
                  <Badge
                    key={`${post.id}-${tag}`}
                    variant="secondary"
                    className="bg-white/20 text-white hover:bg-white/20"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
              <h1 className="flex items-center gap-2 text-xl font-semibold leading-tight sm:text-2xl md:text-3xl">
                <PostIcon post={post} size="md" className="border-white/30 bg-black/35 text-white" />
                <span>{post.title}</span>
              </h1>
              {post.excerpt ? (
                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/85 md:mt-3 md:leading-7 md:text-base">{post.excerpt}</p>
              ) : null}
            </div>
          </div>

          <CardContent className="space-y-6 p-4 md:p-6">
            <PostContentRenderer
              document={post.contentJson}
              notionPageId={post.notionPageId}
              className="space-y-5"
            />
          </CardContent>
        </Card>

        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Article Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              {(post.pageIconEmoji || post.pageIconUrl) ? (
                <p className="flex items-center gap-2">
                  <span className="font-medium text-foreground">Icon:</span>
                  <PostIcon post={post} size="sm" />
                </p>
              ) : null}
              <p>
                <span className="font-medium text-foreground">Updated:</span>{" "}
                {formatIsoToUtcDate(post.updatedAt)}
              </p>
              {post.publishedAt ? (
                <p>
                  <span className="font-medium text-foreground">Published:</span>{" "}
                  {formatIsoToUtcDate(post.publishedAt)}
                </p>
              ) : null}
              {post.syncedAt ? (
                <p>
                  <span className="font-medium text-foreground">Synced:</span>{" "}
                  {formatIsoToUtcDate(post.syncedAt)}
                </p>
              ) : null}
              {post.tags.length > 0 ? (
                <div className="space-y-1">
                  <p className="font-medium text-foreground">Tags:</p>
                  <div className="flex flex-wrap gap-1">
                    {post.tags.map((tag) => (
                      <Badge key={`${post.id}-info-${tag}`} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Table of Contents</CardTitle>
            </CardHeader>
            <CardContent>
              {tocItems.length ? (
                <nav className="space-y-1 text-xs">
                  {tocItems.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className={`block truncate rounded px-1.5 py-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground ${
                        item.level === 1 ? "" : item.level === 2 ? "ml-3" : "ml-6"
                      }`}
                    >
                      {item.title}
                    </a>
                  ))}
                </nav>
              ) : (
                <p className="text-xs text-muted-foreground">No headings found.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">More</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/blog">Back to Blog</Link>
              </Button>
              <Button asChild variant="secondary" size="sm" className="w-full">
                <Link href="/resume">View Resume</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
