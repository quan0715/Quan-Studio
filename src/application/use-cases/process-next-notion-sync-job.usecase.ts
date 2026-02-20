import {
  NotionModelMapperService,
  parseStoredNotionSchemaFieldMapping,
} from "@/application/services/notion-model-mapper.service";
import { integrationConfigKeys } from "@/domain/integration-config/integration-config";
import type { IntegrationConfigRepository } from "@/domain/integration-config/integration-config-repository";
import {
  extractNotionFileLikeUrl,
  normalizeNotionTimestamp,
} from "@/domain/notion/notion-property-readers";
import {
  getNotionModelById,
  type NotionSchemaModelDescriptor,
} from "@/domain/notion-models/registry";
import type { NotionSyncJobRepository } from "@/domain/notion-sync/notion-sync-job-repository";
import { assertPostInvariants, type Post } from "@/domain/post/post";
import type { PostRepository } from "@/domain/post/post-repository";
import { normalizeSlug, resolveUniqueSlug } from "@/domain/post/slug";
import { NotionClient, type NotionSyncStatusLabel } from "@/infrastructure/notion/notion-client";

type ProcessNextNotionSyncJobOutput =
  | { ok: true; processed: false }
  | { ok: true; processed: true; pageId: string; postId: string }
  | { ok: false; processed: true; pageId: string; error: string };

type NotionPage = {
  id: string;
  created_time: string;
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

type PostIconValue = {
  emoji: string | null;
  url: string | null;
};

export class ProcessNextNotionSyncJobUseCase {
  constructor(
    private readonly syncJobRepository: NotionSyncJobRepository,
    private readonly postRepository: PostRepository,
    private readonly notionClient: NotionClient,
    private readonly integrationConfigRepository: IntegrationConfigRepository,
    private readonly notionModelMapperService: NotionModelMapperService = new NotionModelMapperService()
  ) {}

  async execute(lockId: string): Promise<ProcessNextNotionSyncJobOutput> {
    const job = await this.syncJobRepository.claimNext(lockId);
    if (!job) {
      return { ok: true, processed: false };
    }

    await this.syncStatusSafely(job.pageId, "Processing");

    try {
      const saved = await this.syncPage(job.pageId);
      await this.syncJobRepository.markStatus(job.id, "succeeded", {
        attempt: job.attempt + 1,
        errorMessage: null,
        nextRunAt: null,
        lockedAt: null,
        lockedBy: null,
      });
      await this.syncStatusSafely(job.pageId, "Success");

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
      await this.syncStatusSafely(job.pageId, "Failed");
      return { ok: false, processed: true, pageId: job.pageId, error: stringifyError(error) };
    }
  }

  async executePage(
    pageId: string
  ): Promise<{ ok: true; pageId: string; postId: string } | { ok: false; pageId: string; error: string }> {
    const normalizedPageId = pageId.trim();
    if (!normalizedPageId) {
      return { ok: false, pageId: "", error: "pageId is required" };
    }

    await this.syncStatusSafely(normalizedPageId, "Processing");

    try {
      const saved = await this.syncPage(normalizedPageId);
      await this.syncStatusSafely(normalizedPageId, "Success");
      return { ok: true, pageId: normalizedPageId, postId: saved.id };
    } catch (error) {
      await this.syncStatusSafely(normalizedPageId, "Failed");
      return {
        ok: false,
        pageId: normalizedPageId,
        error: stringifyError(error),
      };
    }
  }

  private async syncPage(pageId: string): Promise<Post> {
    const page = (await this.notionClient.retrievePage(pageId)) as NotionPage;
    const blocks = (await this.notionClient.retrieveAllBlockChildren(pageId)) as NotionBlocks;
    const post = await this.mapToPost(page, blocks);

    return this.postRepository.upsertByNotionPageId(post);
  }

  private async mapToPost(page: NotionPage, blocks: NotionBlocks): Promise<Post> {
    const blogSchemaModel = getBlogSchemaModel();
    const storedMappingConfig = await this.integrationConfigRepository.findByKey(
      integrationConfigKeys.notionSchemaFieldMapping
    );
    const storedMapping = parseStoredNotionSchemaFieldMapping(storedMappingConfig?.value ?? "");
    const explicitMappings = storedMapping.sources[blogSchemaModel.schemaSource] ?? {};
    const mappedFields = this.notionModelMapperService.mapPageFields({
      expectations: blogSchemaModel.schemaMapping.expectations,
      builtinChecks: blogSchemaModel.schemaMapping.builtinChecks,
      explicitMappings,
      page,
    });

    const title = optionalText(asOptionalString(mappedFields["post.title"])) ?? "Untitled";
    const preferredSlug = normalizeSlug(
      asOptionalString(mappedFields["post.slug"]) || title || page.id
    );
    const status = toPostStatus(mappedFields["post.status"]);
    const excerpt = optionalText(asOptionalString(mappedFields["post.excerpt"]));
    const tags = asStringArray(mappedFields["post.tags"]);
    const coverUrl =
      asOptionalString(mappedFields["post.cover"]) ??
      extractPropertyCoverUrl(page.properties) ??
      extractFirstImageUrlFromBlocks(blocks.results);
    const pageIcon = asPostIconValue(mappedFields["post.icon"]) ?? extractPageIcon(page.icon);
    const richTextProperties = extractRichTextProperties(page.properties);
    const createdTimeRaw = asOptionalString(mappedFields["post.createdTime"]) ?? page.created_time;
    const lastEditedTimeRaw =
      asOptionalString(mappedFields["post.lastEditedTime"]) ?? page.last_edited_time;
    const notionLastEditedAt = parseDate(lastEditedTimeRaw);
    const notionCreatedAt = parseDate(createdTimeRaw);
    const pageTimestamps = buildPageTimestamps(createdTimeRaw, lastEditedTimeRaw);

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
        pageTimestamps,
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
      publishedAt:
        status === "published"
          ? existing?.publishedAt ?? notionCreatedAt ?? notionLastEditedAt ?? now
          : null,
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

  private async syncStatusSafely(pageId: string, status: NotionSyncStatusLabel): Promise<void> {
    try {
      await this.notionClient.updatePageSyncStatus(pageId, status);
    } catch (error) {
      console.warn("[notion-sync] failed to update Sync Status", {
        pageId,
        status,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

function getBlogSchemaModel(): NotionSchemaModelDescriptor {
  const descriptor = getNotionModelById("blog");
  if (!descriptor || descriptor.schemaSource !== "blog" || !descriptor.schemaMapping) {
    throw new Error("blog notion schema model is not properly configured");
  }
  return descriptor as NotionSchemaModelDescriptor;
}

function asOptionalString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function toPostStatus(value: unknown): "draft" | "published" {
  if (typeof value !== "string") {
    return "draft";
  }
  return value.trim().toLowerCase() === "published" ? "published" : "draft";
}

function asPostIconValue(value: unknown): PostIconValue | null {
  if (!isPlainObject(value)) {
    return null;
  }

  return {
    emoji: typeof value.emoji === "string" ? value.emoji : null,
    url: typeof value.url === "string" ? value.url : null,
  };
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

function buildPageTimestamps(
  createdTimeRaw: string | null,
  lastEditedTimeRaw: string | null
): { createdTime: string | null; lastEditedTime: string | null } {
  return {
    createdTime: normalizeNotionTimestamp(createdTimeRaw),
    lastEditedTime: normalizeNotionTimestamp(lastEditedTimeRaw),
  };
}

function stringifyError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "unknown error";
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

function extractPageIcon(icon: unknown): PostIconValue | null {
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

function toPlainRecord(value: unknown): Record<string, unknown> {
  if (!isPlainObject(value)) {
    return {};
  }

  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
