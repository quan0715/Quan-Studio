import type { NotionModelSyncHandler } from "@/application/sync-handlers/notion-model-sync-handler";
import {
  NotionModelMapperService,
  parseStoredNotionSchemaFieldMapping,
} from "@/application/services/notion-model-mapper.service";
import { toSchemaMappingFromDefinition } from "@/application/services/notion-model-definition-adapter";
import { isPlainObject } from "@/shared/utils/type-guards";
import { integrationConfigKeys } from "@/domain/integration-config/integration-config";
import type { IntegrationConfigRepository } from "@/domain/integration-config/integration-config-repository";
import type { NotionModelDefinitionRepository } from "@/domain/notion-model-definition/notion-model-definition-repository";
import {
  extractNotionFileLikeUrl,
  extractPageIcon,
  normalizeNotionTimestamp,
  optionalText,
} from "@/domain/notion/notion-property-readers";
import { assertPostInvariants, type Post } from "@/domain/post/post";
import type { PostRepository } from "@/domain/post/post-repository";
import { normalizeSlug, resolveUniqueSlug } from "@/domain/post/slug";
import { NotionClient } from "@/infrastructure/notion/notion-client";

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

export class BlogSyncHandler implements NotionModelSyncHandler {
  readonly modelId = "blog";

  constructor(
    private readonly postRepository: PostRepository,
    private readonly notionClient: NotionClient,
    private readonly integrationConfigRepository: IntegrationConfigRepository,
    private readonly notionModelDefinitionRepository: NotionModelDefinitionRepository,
    private readonly notionModelMapperService: NotionModelMapperService = new NotionModelMapperService()
  ) {}

  async syncPage(pageId: string): Promise<{ entityId: string }> {
    const page = (await this.notionClient.retrievePage(pageId)) as NotionPage;
    const blocks = (await this.notionClient.retrieveAllBlockChildren(pageId)) as NotionBlocks;
    const post = await this.mapToPost(page, blocks);
    const saved = await this.postRepository.upsertByNotionPageId(post);
    return { entityId: saved.id };
  }

  private async mapToPost(page: NotionPage, blocks: NotionBlocks): Promise<Post> {
    const blogModel = await this.notionModelDefinitionRepository.findByModelKey("blog");
    if (!blogModel) {
      throw new Error("blog notion model definition is not configured");
    }
    const blogSchemaMapping = toSchemaMappingFromDefinition(blogModel);
    const storedMappingConfig = await this.integrationConfigRepository.findByKey(
      integrationConfigKeys.notionSchemaFieldMapping
    );
    const storedMapping = parseStoredNotionSchemaFieldMapping(storedMappingConfig?.value ?? "");
    const explicitMappings = storedMapping.sources[blogModel.schemaSource] ?? {};
    const mappedFields = this.notionModelMapperService.mapPageFields({
      expectations: blogSchemaMapping.expectations,
      builtinChecks: blogSchemaMapping.builtinChecks,
      explicitMappings,
      page,
    });

    const title = optionalText(readMappedStringBySuffix(mappedFields, "title")) ?? "Untitled";
    const preferredSlug = normalizeSlug(
      readMappedStringBySuffix(mappedFields, "slug") || title || page.id
    );
    const status = toPostStatus(readMappedUnknownBySuffix(mappedFields, "status"));
    const excerpt = optionalText(readMappedStringBySuffix(mappedFields, "excerpt"));
    const tags = readMappedStringArrayBySuffix(mappedFields, "tags");
    const coverUrl =
      readMappedStringBySuffix(mappedFields, "cover") ??
      extractPropertyCoverUrl(page.properties) ??
      null;
    const pageIcon =
      asPostIconValue(readMappedUnknownBySuffix(mappedFields, "icon")) ??
      extractPageIcon(page.icon);
    const richTextProperties = extractRichTextProperties(page.properties);
    const createdTimeRaw =
      readMappedStringBySuffix(mappedFields, "createdTime") ??
      page.created_time;
    const lastEditedTimeRaw =
      readMappedStringBySuffix(mappedFields, "lastEditedTime") ??
      page.last_edited_time;
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

function readMappedUnknownBySuffix(mappedFields: Record<string, unknown>, suffix: string): unknown {
  const dotSuffix = `.${suffix}`;
  const fallback = Object.entries(mappedFields).find(([key]) => key.endsWith(dotSuffix) && !key.startsWith("sync."));
  return fallback ? fallback[1] : null;
}

function readMappedStringBySuffix(mappedFields: Record<string, unknown>, suffix: string): string | null {
  return asOptionalString(readMappedUnknownBySuffix(mappedFields, suffix));
}

function readMappedStringArrayBySuffix(mappedFields: Record<string, unknown>, suffix: string): string[] {
  return asStringArray(readMappedUnknownBySuffix(mappedFields, suffix));
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

function buildPageTimestamps(
  createdTimeRaw: string | null,
  lastEditedTimeRaw: string | null
): { createdTime: string | null; lastEditedTime: string | null } {
  return {
    createdTime: normalizeNotionTimestamp(createdTimeRaw),
    lastEditedTime: normalizeNotionTimestamp(lastEditedTimeRaw),
  };
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
