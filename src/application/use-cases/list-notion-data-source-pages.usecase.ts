import { AppError } from "@/application/errors";
import {
  normalizeNotionTimestamp,
} from "@/domain/notion/notion-property-readers";
import {
  NotionModelMapperService,
  parseStoredNotionSchemaFieldMapping,
} from "@/application/services/notion-model-mapper.service";
import { toSchemaMappingFromDefinition } from "@/application/services/notion-model-definition-adapter";
import { integrationConfigKeys } from "@/domain/integration-config/integration-config";
import type { IntegrationConfigRepository } from "@/domain/integration-config/integration-config-repository";
import type { NotionModelDefinitionRepository } from "@/domain/notion-model-definition/notion-model-definition-repository";
import type { Post } from "@/domain/post/post";
import type { PostRepository } from "@/domain/post/post-repository";
import { NotionClient } from "@/infrastructure/notion/notion-client";

export type NotionDataSourcePage = {
  pageId: string;
  url: string;
  title: string;
  slug: string | null;
  status: string | null;
  tags: string[];
  createdTime: string | null;
  lastEditedTime: string;
  lastSyncedAt: string | null;
  lastSyncedNotionEditedTime: string | null;
  requiresSync: boolean;
  websiteUrl: string | null;
};

type NotionQueryResponse = {
  object: "list";
  results: Array<Record<string, unknown>>;
  has_more: boolean;
  next_cursor: string | null;
};

export class ListNotionDataSourcePagesUseCase {
  constructor(
    private readonly notionClient: NotionClient,
    private readonly notionModelDefinitionRepository: NotionModelDefinitionRepository,
    private readonly integrationConfigRepository: IntegrationConfigRepository,
    private readonly postRepository: PostRepository,
    private readonly notionModelMapperService: NotionModelMapperService = new NotionModelMapperService()
  ) {}

  async execute(limit = 50): Promise<NotionDataSourcePage[]> {
    const normalizedLimit = Math.min(Math.max(Math.floor(limit), 1), 100);
    const blogModel = await this.notionModelDefinitionRepository.findByModelKey("blog");
    const dataSourceId = blogModel?.dataSourceId?.trim() ?? "";

    if (!blogModel || !dataSourceId) {
      throw new AppError("VALIDATION_ERROR", "Notion blog data source id is not configured");
    }

    const schema = toSchemaMappingFromDefinition(blogModel);
    const stored = await this.integrationConfigRepository.findByKey(
      integrationConfigKeys.notionSchemaFieldMapping
    );
    const storedMapping = parseStoredNotionSchemaFieldMapping(stored?.value ?? "");
    const explicitMappings = storedMapping.sources[blogModel.schemaSource] ?? {};

    const response = (await this.notionClient.queryDataSourceWithId(dataSourceId, normalizedLimit)) as NotionQueryResponse;
    const posts = await this.postRepository.listAll();
    const postByPageId = new Map(posts.map((post) => [post.notionPageId, post]));

    return response.results
      .map((page) =>
        toNotionDataSourcePage(
          page,
          postByPageId,
          this.notionModelMapperService,
          schema,
          explicitMappings
        )
      )
      .filter((page): page is NotionDataSourcePage => page !== null);
  }
}

function toNotionDataSourcePage(
  page: Record<string, unknown>,
  postByPageId: Map<string, Post>,
  notionModelMapperService: NotionModelMapperService,
  schema: ReturnType<typeof toSchemaMappingFromDefinition>,
  explicitMappings: Record<string, string>
): NotionDataSourcePage | null {
  const objectType = page.object;
  if (objectType !== "page") {
    return null;
  }

  const pageId = typeof page.id === "string" ? page.id : "";
  const url = typeof page.url === "string" ? page.url : "";
  const createdTime = normalizeNotionTimestamp(
    typeof page.created_time === "string" ? page.created_time : null
  );
  const lastEditedTime = normalizeNotionTimestamp(
    typeof page.last_edited_time === "string" ? page.last_edited_time : null
  );

  if (!pageId || !url || !lastEditedTime) {
    return null;
  }

  const properties =
    page.properties && typeof page.properties === "object"
      ? (page.properties as Record<string, unknown>)
      : {};

  const mapped = notionModelMapperService.mapPageFields({
    expectations: schema.expectations,
    builtinChecks: schema.builtinChecks,
    explicitMappings,
    page: {
      created_time: typeof page.created_time === "string" ? page.created_time : "",
      last_edited_time: typeof page.last_edited_time === "string" ? page.last_edited_time : "",
      cover: page.cover,
      icon: page.icon,
      properties,
    },
  });

  const title = readMappedStringBySuffix(mapped, "title") ?? "Untitled";
  const slug = readMappedStringBySuffix(mapped, "slug");
  const status = readMappedStringBySuffix(mapped, "status");
  const tags = readMappedStringArrayBySuffix(mapped, "tags");
  const syncedPost = postByPageId.get(pageId) ?? null;
  const requiresSync = resolveRequiresSync(lastEditedTime, syncedPost?.notionLastEditedAt ?? null);

  return {
    pageId,
    url,
    title,
    slug,
    status,
    tags,
    createdTime,
    lastEditedTime,
    lastSyncedAt: syncedPost?.syncedAt?.toISOString() ?? null,
    lastSyncedNotionEditedTime: syncedPost?.notionLastEditedAt?.toISOString() ?? null,
    requiresSync,
    websiteUrl:
      syncedPost?.status === "published" && syncedPost.slug
        ? `/blog/${encodeURIComponent(syncedPost.slug)}`
        : null,
  };
}

function readMappedUnknownBySuffix(mappedFields: Record<string, unknown>, suffix: string): unknown {
  const dotSuffix = `.${suffix}`;
  const fallback = Object.entries(mappedFields).find(([key]) => key.endsWith(dotSuffix) && !key.startsWith("sync."));
  return fallback ? fallback[1] : null;
}

function readMappedStringBySuffix(mappedFields: Record<string, unknown>, suffix: string): string | null {
  const value = readMappedUnknownBySuffix(mappedFields, suffix);
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readMappedStringArrayBySuffix(mappedFields: Record<string, unknown>, suffix: string): string[] {
  const value = readMappedUnknownBySuffix(mappedFields, suffix);
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function resolveRequiresSync(lastEditedTime: string, notionLastEditedAt: Date | null): boolean {
  if (!notionLastEditedAt) {
    return true;
  }

  const notionTimestamp = Date.parse(lastEditedTime);
  if (Number.isNaN(notionTimestamp)) {
    return true;
  }

  return notionTimestamp !== notionLastEditedAt.getTime();
}
