import { AppError } from "@/application/errors";
import { integrationConfigKeys } from "@/domain/integration-config/integration-config";
import type { IntegrationConfigRepository } from "@/domain/integration-config/integration-config-repository";
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
  const lastEditedTime = typeof page.last_edited_time === "string" ? page.last_edited_time : "";

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
  const status = extractPropertyStatus(properties, "Status");
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

function extractPropertyStatus(properties: Record<string, unknown>, key: string): string | null {
  const value = properties[key];
  if (!value || typeof value !== "object") {
    return null;
  }

  const obj = value as Record<string, unknown>;
  const statusObj = obj.status;
  if (statusObj && typeof statusObj === "object") {
    const name = (statusObj as Record<string, unknown>).name;
    return typeof name === "string" ? name : null;
  }

  const selectObj = obj.select;
  if (selectObj && typeof selectObj === "object") {
    const name = (selectObj as Record<string, unknown>).name;
    return typeof name === "string" ? name : null;
  }

  return null;
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

    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj.multi_select)) {
      return obj.multi_select
        .map((item) => {
          if (!item || typeof item !== "object") {
            return "";
          }
          const name = (item as Record<string, unknown>).name;
          return typeof name === "string" ? name.trim() : "";
        })
        .filter((name) => name.length > 0);
    }

    if (obj.select && typeof obj.select === "object") {
      const name = (obj.select as Record<string, unknown>).name;
      if (typeof name === "string" && name.trim()) {
        return [name.trim()];
      }
    }
  }

  return [];
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
    .join("")
    .trim();
}
