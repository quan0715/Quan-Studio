export type PostStatus = "draft" | "published";

export type NotionBlocksDocument = Record<string, unknown>;

export type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  tags: string[];
  status: PostStatus;
  contentJson: NotionBlocksDocument;
  coverUrl: string | null;
  publishedAt: Date | null;
  notionPageId: string;
  notionLastEditedAt: Date | null;
  syncedAt: Date | null;
  syncError: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function assertValidTitle(title: string): void {
  if (!title.trim()) {
    throw new Error("title must not be empty");
  }
}

function assertValidSlug(slug: string): void {
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error("slug must be URL-safe");
  }
}

export function assertPostInvariants(post: Post): void {
  assertValidTitle(post.title);
  assertValidSlug(post.slug);
  if (!post.notionPageId.trim()) {
    throw new Error("notionPageId must not be empty");
  }

  if (post.status === "published" && !post.publishedAt) {
    throw new Error("published post must have publishedAt");
  }
}
