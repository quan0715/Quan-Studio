import type { Post } from "@/domain/post/post";

export function toPostListItemDto(post: Post) {
  const pageIcon = extractPageIcon(post.contentJson);
  const pageTimestamps = extractPageTimestamps(post.contentJson);

  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    status: post.status,
    excerpt: post.excerpt,
    tags: post.tags,
    coverUrl: post.coverUrl,
    updatedAt: post.updatedAt.toISOString(),
    publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
    notionPageId: post.notionPageId,
    syncedAt: post.syncedAt ? post.syncedAt.toISOString() : null,
    syncError: post.syncError,
    pageIconEmoji: pageIcon.emoji,
    pageIconUrl: pageIcon.url,
    notionPageCreatedTime: pageTimestamps.createdTime,
    notionPageLastEditedTime: pageTimestamps.lastEditedTime,
  };
}

export function toPostDetailDto(post: Post) {
  return {
    ...toPostListItemDto(post),
    contentJson: post.contentJson,
    createdAt: post.createdAt.toISOString(),
    notionLastEditedAt: post.notionLastEditedAt ? post.notionLastEditedAt.toISOString() : null,
  };
}

function extractPageIcon(contentJson: Record<string, unknown>): { emoji: string | null; url: string | null } {
  const notionMeta = contentJson._notion;
  if (!isPlainObject(notionMeta)) {
    return { emoji: null, url: null };
  }

  const pageIcon = notionMeta.pageIcon;
  if (!isPlainObject(pageIcon)) {
    return { emoji: null, url: null };
  }

  const emoji = typeof pageIcon.emoji === "string" ? pageIcon.emoji : null;
  const url = typeof pageIcon.url === "string" ? pageIcon.url : null;
  return { emoji, url };
}

function extractPageTimestamps(contentJson: Record<string, unknown>): {
  createdTime: string | null;
  lastEditedTime: string | null;
} {
  const notionMeta = contentJson._notion;
  if (!isPlainObject(notionMeta)) {
    return { createdTime: null, lastEditedTime: null };
  }

  const pageTimestamps = notionMeta.pageTimestamps;
  if (!isPlainObject(pageTimestamps)) {
    return { createdTime: null, lastEditedTime: null };
  }

  const createdTime = typeof pageTimestamps.createdTime === "string" ? pageTimestamps.createdTime : null;
  const lastEditedTime =
    typeof pageTimestamps.lastEditedTime === "string" ? pageTimestamps.lastEditedTime : null;

  return { createdTime, lastEditedTime };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
