import { assertPostInvariants, type Post } from "@/domain/post/post";
import type { PostRepository } from "@/domain/post/post-repository";
import { normalizeSlug, resolveUniqueSlug } from "@/domain/post/slug";
import type { NotionSyncJobRepository } from "@/domain/notion-sync/notion-sync-job-repository";
import { NotionClient } from "@/infrastructure/notion/notion-client";

type ProcessNextNotionSyncJobOutput =
  | { ok: true; processed: false }
  | { ok: true; processed: true; pageId: string; postId: string }
  | { ok: false; processed: true; pageId: string; error: string };

type NotionPage = {
  id: string;
  last_edited_time: string;
  cover?: unknown;
  icon?: unknown;
  properties: Record<string, unknown>;
};

type NotionBlocks = {
  object: "list";
  results: Array<Record<string, unknown>>;
  has_more: boolean;
  next_cursor: string | null;
};

export class ProcessNextNotionSyncJobUseCase {
  constructor(
    private readonly syncJobRepository: NotionSyncJobRepository,
    private readonly postRepository: PostRepository,
    private readonly notionClient: NotionClient
  ) {}

  async execute(lockId: string): Promise<ProcessNextNotionSyncJobOutput> {
    const job = await this.syncJobRepository.claimNext(lockId);
    if (!job) {
      return { ok: true, processed: false };
    }

    try {
      const page = (await this.notionClient.retrievePage(job.pageId)) as NotionPage;
      const blocks = (await this.notionClient.retrieveAllBlockChildren(job.pageId)) as NotionBlocks;
      const post = await this.mapToPost(page, blocks);

      const saved = await this.postRepository.upsertByNotionPageId(post);
      await this.syncJobRepository.markStatus(job.id, "succeeded", {
        attempt: job.attempt + 1,
        errorMessage: null,
        nextRunAt: null,
        lockedAt: null,
        lockedBy: null,
      });

      return { ok: true, processed: true, pageId: job.pageId, postId: saved.id };
    } catch (error) {
      const attempt = job.attempt + 1;
      const waitMs = Math.min(60_000, 1_000 * 2 ** Math.max(0, job.attempt));
      const nextRunAt = attempt >= job.maxAttempts ? null : new Date(Date.now() + waitMs);
      await this.syncJobRepository.markStatus(job.id, "failed", {
        attempt,
        errorMessage: stringifyError(error),
        nextRunAt,
        lockedAt: null,
        lockedBy: null,
      });
      return { ok: false, processed: true, pageId: job.pageId, error: stringifyError(error) };
    }
  }

  private async mapToPost(page: NotionPage, blocks: NotionBlocks): Promise<Post> {
    const title =
      extractPropertyText(page.properties, "Title") ||
      extractPropertyText(page.properties, "Name") ||
      "Untitled";
    const preferredSlug = normalizeSlug(extractPropertyText(page.properties, "Slug") || title || page.id);
    const status = extractPropertyStatus(page.properties, "Status");
    const excerpt = optionalText(extractPropertyText(page.properties, "Excerpt"));
    const tags = extractPropertyMultiSelectNames(page.properties, ["Tags", "Tag"]);
    const coverUrl =
      extractPageCoverUrl(page.cover) ??
      extractPropertyCoverUrl(page.properties) ??
      extractFirstImageUrlFromBlocks(blocks.results);
    const pageIcon = extractPageIcon(page.icon);
    const richTextProperties = extractRichTextProperties(page.properties);
    const notionLastEditedAt = parseDate(page.last_edited_time);
    const publishedAt = parseDate(extractPropertyDate(page.properties, "Published At"));

    const existing = await this.postRepository.findByNotionPageId(page.id);
    const resolvedSlug = await resolveUniqueSlug(preferredSlug || normalizeSlug(page.id), async (candidate) => {
      const bySlug = await this.postRepository.findBySlug(candidate);
      if (!bySlug) {
        return false;
      }
      return bySlug.notionPageId !== page.id;
    });

    const blocksJson = toPlainRecord(blocks);
    const currentNotionMeta = isPlainObject(blocksJson._notion) ? blocksJson._notion : {};
    const contentJson: Record<string, unknown> = {
      ...blocksJson,
      _notion: {
        ...currentNotionMeta,
        richTextProperties,
        pageIcon,
      },
    };

    const now = new Date();
    const post: Post = {
      id: existing?.id ?? crypto.randomUUID(),
      title: title.trim(),
      slug: resolvedSlug,
      excerpt,
      tags,
      status,
      contentJson,
      coverUrl,
      publishedAt: status === "published" ? publishedAt ?? existing?.publishedAt ?? now : null,
      notionPageId: page.id,
      notionLastEditedAt,
      syncedAt: now,
      syncError: null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    assertPostInvariants(post);
    return post;
  }
}

function parseDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function optionalText(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function stringifyError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "unknown error";
}

function extractPropertyText(properties: Record<string, unknown>, key: string): string | null {
  const value = properties[key];
  if (!value || typeof value !== "object") {
    return null;
  }
  const obj = value as Record<string, unknown>;

  if (Array.isArray(obj.title)) {
    return richTextToPlain(obj.title);
  }
  if (Array.isArray(obj.rich_text)) {
    return richTextToPlain(obj.rich_text);
  }
  if (typeof obj.plain_text === "string") {
    return obj.plain_text;
  }

  return null;
}

function extractPropertyStatus(properties: Record<string, unknown>, key: string): "draft" | "published" {
  const value = properties[key];
  if (!value || typeof value !== "object") {
    return "draft";
  }

  const record = value as Record<string, unknown>;

  const status = record.status;
  if (status && typeof status === "object") {
    const name = ((status as Record<string, unknown>).name as string | undefined)?.toLowerCase() ?? "";
    return name === "published" ? "published" : "draft";
  }

  const select = record.select;
  if (select && typeof select === "object") {
    const name = ((select as Record<string, unknown>).name as string | undefined)?.toLowerCase() ?? "";
    return name === "published" ? "published" : "draft";
  }

  return "draft";
}

function extractPropertyDate(properties: Record<string, unknown>, key: string): string | null {
  const value = properties[key];
  if (!value || typeof value !== "object") {
    return null;
  }
  const date = (value as Record<string, unknown>).date;
  if (!date || typeof date !== "object") {
    return null;
  }
  const start = (date as Record<string, unknown>).start;
  return typeof start === "string" ? start : null;
}

function extractPropertyMultiSelectNames(
  properties: Record<string, unknown>,
  keys: string[]
): string[] {
  for (const key of keys) {
    const value = properties[key];
    if (!value || typeof value !== "object") {
      continue;
    }

    const record = value as Record<string, unknown>;

    if (Array.isArray(record.multi_select)) {
      return record.multi_select
        .map((item) => {
          if (!item || typeof item !== "object") {
            return "";
          }
          const name = (item as Record<string, unknown>).name;
          return typeof name === "string" ? name.trim() : "";
        })
        .filter((name) => name.length > 0);
    }

    if (record.select && typeof record.select === "object") {
      const selectName = (record.select as Record<string, unknown>).name;
      if (typeof selectName === "string" && selectName.trim()) {
        return [selectName.trim()];
      }
    }
  }

  return [];
}

function extractPageCoverUrl(cover: unknown): string | null {
  if (!isPlainObject(cover)) {
    return null;
  }

  if (cover.type === "external" && isPlainObject(cover.external)) {
    const url = cover.external.url;
    return typeof url === "string" ? url : null;
  }

  if (cover.type === "file" && isPlainObject(cover.file)) {
    const url = cover.file.url;
    return typeof url === "string" ? url : null;
  }

  return null;
}

function extractPropertyCoverUrl(properties: Record<string, unknown>): string | null {
  const candidates = ["Cover", "cover", "封面"];

  for (const key of candidates) {
    const value = properties[key];
    if (!isPlainObject(value)) {
      continue;
    }

    const files = Array.isArray(value.files) ? value.files : [];
    for (const file of files) {
      const url = extractNotionFileLikeUrl(file);
      if (url) {
        return url;
      }
    }
  }

  return null;
}

function extractFirstImageUrlFromBlocks(blocks: Array<Record<string, unknown>>): string | null {
  for (const block of blocks) {
    const type = typeof block.type === "string" ? block.type : null;
    if (!type) {
      continue;
    }

    if (type === "image") {
      const imageData = block.image;
      const imageUrl = extractNotionFileLikeUrl(imageData);
      if (imageUrl) {
        return imageUrl;
      }
    }

    const blockData = block[type];
    if (isPlainObject(blockData) && Array.isArray(blockData.children)) {
      const children = blockData.children.filter(isPlainObject);
      const nested = extractFirstImageUrlFromBlocks(children);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

function extractNotionFileLikeUrl(value: unknown): string | null {
  if (!isPlainObject(value)) {
    return null;
  }

  if (value.type === "external" && isPlainObject(value.external)) {
    const url = value.external.url;
    return typeof url === "string" ? url : null;
  }

  if (value.type === "file" && isPlainObject(value.file)) {
    const url = value.file.url;
    return typeof url === "string" ? url : null;
  }

  return null;
}

function extractPageIcon(icon: unknown): { emoji: string | null; url: string | null } | null {
  if (!isPlainObject(icon)) {
    return null;
  }

  if (icon.type === "emoji") {
    return {
      emoji: typeof icon.emoji === "string" ? icon.emoji : null,
      url: null,
    };
  }

  if (icon.type === "external" && isPlainObject(icon.external)) {
    return {
      emoji: null,
      url: typeof icon.external.url === "string" ? icon.external.url : null,
    };
  }

  if (icon.type === "file" && isPlainObject(icon.file)) {
    return {
      emoji: null,
      url: typeof icon.file.url === "string" ? icon.file.url : null,
    };
  }

  if (icon.type === "custom_emoji" && isPlainObject(icon.custom_emoji)) {
    return {
      emoji: null,
      url: typeof icon.custom_emoji.url === "string" ? icon.custom_emoji.url : null,
    };
  }

  return null;
}

function extractRichTextProperties(properties: Record<string, unknown>): Record<string, unknown[]> {
  const result: Record<string, unknown[]> = {};

  for (const [name, value] of Object.entries(properties)) {
    if (!isPlainObject(value)) {
      continue;
    }

    if (Array.isArray(value.title)) {
      result[name] = value.title.filter(isPlainObject);
      continue;
    }

    if (Array.isArray(value.rich_text)) {
      result[name] = value.rich_text.filter(isPlainObject);
    }
  }

  return result;
}

function richTextToPlain(items: unknown[]): string {
  return items
    .map((item) => {
      if (!item || typeof item !== "object") {
        return "";
      }
      const plainText = (item as Record<string, unknown>).plain_text;
      return typeof plainText === "string" ? plainText : "";
    })
    .join("");
}

function toPlainRecord(value: unknown): Record<string, unknown> {
  if (!isPlainObject(value)) {
    return {};
  }

  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
