import { AppError } from "@/application/errors";
import { integrationConfigKeys } from "@/domain/integration-config/integration-config";
import type { IntegrationConfigRepository } from "@/domain/integration-config/integration-config-repository";
import {
  extractPropertyMultiSelectNames,
  extractPropertyStatusName,
  extractPropertyText,
  normalizeNotionTimestamp,
} from "@/domain/notion/notion-property-readers";
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
    private readonly integrationConfigRepository: IntegrationConfigRepository,
    private readonly postRepository: PostRepository
  ) {}

  async execute(limit = 50): Promise<NotionDataSourcePage[]> {
    const normalizedLimit = Math.min(Math.max(Math.floor(limit), 1), 100);
    const configured = await this.integrationConfigRepository.findByKey(integrationConfigKeys.notionBlogDataSourceId);
    const dataSourceId = configured?.value.trim() ?? "";

    if (!dataSourceId) {
      throw new AppError("VALIDATION_ERROR", "Notion blog data source id is not configured");
    }

    const response = (await this.notionClient.queryDataSourceWithId(dataSourceId, normalizedLimit)) as NotionQueryResponse;
    const posts = await this.postRepository.listAll();
    const postByPageId = new Map(posts.map((post) => [post.notionPageId, post]));

    return response.results
      .map((page) => toNotionDataSourcePage(page, postByPageId))
      .filter((page): page is NotionDataSourcePage => page !== null);
  }
}

function toNotionDataSourcePage(
  page: Record<string, unknown>,
  postByPageId: Map<string, Post>
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

  const title =
    extractPropertyText(properties, "Name") ||
    extractPropertyText(properties, "Title") ||
    "Untitled";
  const slug = extractPropertyText(properties, "Slug");
  const status = extractPropertyStatusName(properties, "Status");
  const tags = extractPropertyMultiSelectNames(properties, ["Tags", "Tag"]);
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
