import {
  NotionModelMapperService,
  parseStoredNotionSchemaFieldMapping,
  toMappedPageIcon,
  toMappedString,
  toMappedStringArray,
} from "@/application/services/notion-model-mapper.service";
import { QueryNotionModelDataService } from "@/application/services/query-notion-model-data.service";
import { toSchemaMappingFromDefinition } from "@/application/services/notion-model-definition-adapter";
import { integrationConfigKeys } from "@/domain/integration-config/integration-config";
import type { IntegrationConfigRepository } from "@/domain/integration-config/integration-config-repository";
import type { NotionModelDefinitionRepository } from "@/domain/notion-model-definition/notion-model-definition-repository";
import type { PublicPostDataGateway } from "@/domain/post/public-post-data-gateway";
import type { Post } from "@/domain/post/post";
import { normalizeSlug } from "@/domain/post/slug";
import { normalizeNotionTimestamp } from "@/domain/notion/notion-property-readers";
import { NotionClient } from "@/infrastructure/notion/notion-client";
import { isPlainObject } from "@/shared/utils/type-guards";

const DEFAULT_LIMIT = 200;

type MappedNotionPage = {
  page: Record<string, unknown>;
  mapped: Record<string, unknown>;
};

export class LiveNotionPublicPostGateway implements PublicPostDataGateway {
  private readonly mapper = new NotionModelMapperService();

  constructor(
    private readonly notionClient: NotionClient,
    private readonly queryService: QueryNotionModelDataService,
    private readonly integrationConfigRepository: IntegrationConfigRepository,
    private readonly notionModelDefinitionRepository: NotionModelDefinitionRepository
  ) {}

  async listPublished(): Promise<Post[]> {
    const pages = await this.loadMappedPages(DEFAULT_LIMIT);
    const posts = pages
      .map((item) => toPostRecord(item.page, item.mapped))
      .filter((post): post is Post => post !== null)
      .filter((post) => post.status === "published");

    return posts.sort((a, b) => {
      const aTime = (a.publishedAt ?? a.updatedAt).getTime();
      const bTime = (b.publishedAt ?? b.updatedAt).getTime();
      return bTime - aTime;
    });
  }

  async findPublishedBySlug(slug: string): Promise<Post | null> {
    const normalizedSlug = normalizeSlug(slug);
    if (!normalizedSlug) {
      return null;
    }

    const pages = await this.loadMappedPages(500);
    const matched = pages
      .map((item) => toPostRecord(item.page, item.mapped))
      .find((post): post is Post => Boolean(post && post.status === "published" && post.slug === normalizedSlug));

    if (!matched) {
      return null;
    }

    const pageId = typeof matched.notionPageId === "string" ? matched.notionPageId : "";
    if (!pageId) {
      return matched;
    }

    try {
      const blocks = await this.notionClient.retrieveAllBlockChildren(pageId);
      const snapshot = isPlainObject(blocks) ? blocks : {};
      const notionMeta = isPlainObject(matched.contentJson._notion) ? matched.contentJson._notion : {};
      return {
        ...matched,
        contentJson: {
          ...snapshot,
          _notion: notionMeta,
        },
      };
    } catch {
      return matched;
    }
  }

  private async loadMappedPages(limit: number): Promise<MappedNotionPage[]> {
    const blogModel = await this.notionModelDefinitionRepository.findByModelKey("blog");
    const dataSourceId = blogModel?.dataSourceId?.trim() ?? "";
    if (!blogModel || !dataSourceId) {
      return [];
    }

    const schema = toSchemaMappingFromDefinition(blogModel);
    const schemaFieldMappingRaw = await this.integrationConfigRepository.findByKey(
      integrationConfigKeys.notionSchemaFieldMapping
    );
    const storedMapping = parseStoredNotionSchemaFieldMapping(schemaFieldMappingRaw?.value ?? "");
    const explicitMappings = storedMapping.sources[blogModel.schemaSource] ?? {};
    const pages = await this.queryService.queryPages({ dataSourceId, limit });

    return pages.map((page) => ({
      page,
      mapped: this.mapper.mapPageFields({
        expectations: schema.expectations,
        builtinChecks: schema.builtinChecks,
        explicitMappings,
        page: {
          created_time: typeof page.created_time === "string" ? page.created_time : "",
          last_edited_time: typeof page.last_edited_time === "string" ? page.last_edited_time : "",
          cover: page.cover,
          icon: page.icon,
          properties: isPlainObject(page.properties) ? page.properties : {},
        },
      }),
    }));
  }
}

function toPostRecord(page: Record<string, unknown>, mapped: Record<string, unknown>): Post | null {
  const pageId = typeof page.id === "string" ? page.id : "";
  if (!pageId) {
    return null;
  }

  const title = toMappedString(mapped["post.title"] ?? mapped["blog.title"]) ?? "Untitled";
  const slug = normalizeSlug(
    toMappedString(mapped["post.slug"] ?? mapped["blog.slug"]) ?? title ?? pageId
  );
  if (!slug) {
    return null;
  }

  const statusRaw = toMappedString(mapped["post.status"] ?? mapped["blog.status"]) ?? "draft";
  const status = statusRaw.trim().toLowerCase() === "published" ? "published" : "draft";
  const excerpt = toMappedString(mapped["post.excerpt"] ?? mapped["blog.excerpt"]);
  const tags = toMappedStringArray(mapped["post.tags"] ?? mapped["blog.tags"]);
  const coverUrl = toMappedString(mapped["post.cover"] ?? mapped["blog.cover"]);
  const icon = toMappedPageIcon(mapped["post.icon"] ?? mapped["blog.icon"]);
  const createdTime =
    normalizeNotionTimestamp(
      toMappedString(mapped["post.createdTime"] ?? mapped["blog.createdTime"]) ??
        (typeof page.created_time === "string" ? page.created_time : null)
    ) ?? null;
  const lastEditedTime =
    normalizeNotionTimestamp(
      toMappedString(mapped["post.lastEditedTime"] ?? mapped["blog.lastEditedTime"]) ??
        (typeof page.last_edited_time === "string" ? page.last_edited_time : null)
    ) ?? null;

  const createdAt = parseDateOrNow(createdTime);
  const updatedAt = parseDateOrNow(lastEditedTime ?? createdTime);
  const notionLastEditedAt = parseDate(lastEditedTime);
  const publishedAt = status === "published" ? parseDate(createdTime) ?? updatedAt : null;

  return {
    id: pageId,
    title,
    slug,
    excerpt,
    tags,
    status,
    contentJson: {
      _notion: {
        pageIcon: icon,
        pageTimestamps: {
          createdTime,
          lastEditedTime,
        },
      },
    },
    coverUrl,
    publishedAt,
    notionPageId: pageId,
    notionLastEditedAt,
    syncedAt: null,
    syncError: null,
    createdAt,
    updatedAt,
  };
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateOrNow(value: string | null): Date {
  return parseDate(value) ?? new Date();
}

