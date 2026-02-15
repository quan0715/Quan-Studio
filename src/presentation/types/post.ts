export type PostStatus = "draft" | "published";

export type PostListItemDto = {
  id: string;
  title: string;
  slug: string;
  status: PostStatus;
  excerpt: string | null;
  tags: string[];
  coverUrl: string | null;
  updatedAt: string;
  publishedAt: string | null;
  notionPageId: string;
  syncedAt: string | null;
  syncError: string | null;
  pageIconEmoji: string | null;
  pageIconUrl: string | null;
  notionPageCreatedTime: string | null;
  notionPageLastEditedTime: string | null;
};

export type PostDetailDto = PostListItemDto & {
  contentJson: Record<string, unknown>;
  coverUrl: string | null;
  notionLastEditedAt: string | null;
};
