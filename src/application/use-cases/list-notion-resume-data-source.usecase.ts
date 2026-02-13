import { AppError } from "@/application/errors";
import { integrationConfigKeys } from "@/domain/integration-config/integration-config";
import type { IntegrationConfigRepository } from "@/domain/integration-config/integration-config-repository";
import { NotionClient } from "@/infrastructure/notion/notion-client";

type NotionQueryResponse = {
  object: "list";
  results: Array<Record<string, unknown>>;
  has_more: boolean;
  next_cursor: string | null;
};

type ResumeRow = {
  pageId: string;
  section: string;
  group: string;
  name: string;
  summary: string | null;
  organization: string | null;
  role: string | null;
  period: string | null;
  bullets: string[];
  tags: string[];
  sort: number;
};

export type ResumeItemOutput = {
  id: string;
  title: string;
  period?: string;
  organization?: string;
  subtitle?: string;
  summary?: string;
  bullets?: string[];
  keywords?: string[];
  highlightWord?: string;
};

export type ResumeGroupOutput = {
  id: string;
  title: string;
  description?: string;
  items: ResumeItemOutput[];
};

export type ResumeSectionOutput = {
  id: string;
  title: string;
  tags: string[];
  groups: ResumeGroupOutput[];
};

type MutableResumeSection = ResumeSectionOutput & {
  groupIndexMap: Map<string, number>;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export class ListNotionResumeDataSourceUseCase {
  constructor(
    private readonly notionClient: NotionClient,
    private readonly integrationConfigRepository: IntegrationConfigRepository
  ) {}

  async execute(limit = 200): Promise<ResumeSectionOutput[]> {
    const normalizedLimit = Math.min(Math.max(Math.floor(limit), 1), 500);
    const configured = await this.integrationConfigRepository.findByKey(integrationConfigKeys.notionResumeDataSourceId);
    const dataSourceId = configured?.value.trim() ?? "";

    if (!dataSourceId) {
      throw new AppError("VALIDATION_ERROR", "Notion resume data source id is not configured");
    }

    const pages: Array<Record<string, unknown>> = [];
    let cursor: string | undefined;

    while (pages.length < normalizedLimit) {
      const pageSize = Math.min(100, normalizedLimit - pages.length);
      const response = (await this.notionClient.queryDataSourceWithId(dataSourceId, pageSize, cursor)) as NotionQueryResponse;
      pages.push(...response.results);

      if (!response.has_more || !response.next_cursor) {
        break;
      }
      cursor = response.next_cursor;
    }

    const rows = pages
      .map((page) => toResumeRow(page))
      .filter((row): row is ResumeRow => row !== null)
      .sort((a, b) => {
        if (a.sort !== b.sort) {
          return a.sort - b.sort;
        }
        return a.name.localeCompare(b.name);
      });

    return toSections(rows);
  }
}

function toResumeRow(page: Record<string, unknown>): ResumeRow | null {
  if (page.object !== "page") {
    return null;
  }

  const pageId = typeof page.id === "string" ? page.id : "";
  if (!pageId) {
    return null;
  }

  const properties = isPlainObject(page.properties) ? page.properties : {};
  const visibility = extractSelectName(properties, "Visibility");
  if (visibility && visibility.toLowerCase() === "private") {
    return null;
  }

  const section = extractSelectName(properties, "Section") ?? "General";
  const group = extractRichText(properties, "Group") ?? "General";
  const name = extractTitle(properties, "Name") ?? "Untitled";
  const summary = extractRichText(properties, "Summary");
  const organization = extractRichText(properties, "Organization");
  const role = extractRichText(properties, "Role");
  const highlights = extractRichText(properties, "Highlights");
  const period = extractPeriod(properties, highlights);
  const bullets = extractHighlightsBullets(highlights);
  const tags = extractMultiSelectNames(properties, "Tags");
  const sort = extractNumber(properties, "Sort") ?? Number.MAX_SAFE_INTEGER;

  return {
    pageId,
    section,
    group,
    name,
    summary,
    organization,
    role,
    period,
    bullets,
    tags,
    sort,
  };
}

function toSections(rows: ResumeRow[]): ResumeSectionOutput[] {
  const sectionMap = new Map<string, MutableResumeSection>();
  const order: string[] = [];

  for (const row of rows) {
    const sectionId = normalizeId(row.section);
    let section = sectionMap.get(sectionId);
    if (!section) {
      section = {
        id: sectionId,
        title: row.section,
        tags: [],
        groups: [],
        groupIndexMap: new Map<string, number>(),
      };
      sectionMap.set(sectionId, section);
      order.push(sectionId);
    }

    for (const tag of row.tags) {
      if (!section.tags.includes(tag)) {
        section.tags.push(tag);
      }
    }

    const groupId = normalizeId(row.group);
    let groupIndex = section.groupIndexMap.get(groupId);
    if (groupIndex === undefined) {
      groupIndex = section.groups.length;
      section.groupIndexMap.set(groupId, groupIndex);
      section.groups.push({
        id: groupId,
        title: row.group,
        items: [],
      });
    }

    section.groups[groupIndex].items.push(toResumeItem(row));
  }

  return order.map((sectionId) => {
    const section = sectionMap.get(sectionId);
    if (!section) {
      return {
        id: sectionId,
        title: sectionId,
        tags: [],
        groups: [],
      };
    }

    return {
      id: section.id,
      title: section.title,
      tags: section.tags,
      groups: section.groups,
    };
  });
}

function toResumeItem(row: ResumeRow): ResumeItemOutput {
  const item: ResumeItemOutput = {
    id: row.pageId,
    title: row.name,
  };

  if (row.period) {
    item.period = row.period;
  }
  if (row.organization) {
    item.organization = row.organization;
  }
  if (row.role) {
    item.subtitle = row.role;
  }
  if (row.summary) {
    item.summary = row.summary;
  }
  if (row.bullets.length > 0) {
    item.bullets = row.bullets;
  }
  if (row.tags.length > 0) {
    item.keywords = row.tags;
  }

  return item;
}

function extractPeriod(properties: Record<string, unknown>, highlights: string | null): string | null {
  const start = extractDateStart(properties, "Start Date");
  const end = extractDateStart(properties, "End Date");
  const current = extractCheckbox(properties, "Current");

  const startLabel = start ? formatDateLabel(start) : null;
  const endLabel = current ? "Present" : end ? formatDateLabel(end) : null;

  if (startLabel && endLabel) {
    return `${startLabel} - ${endLabel}`;
  }
  if (startLabel) {
    return startLabel;
  }
  if (endLabel) {
    return endLabel;
  }

  if (highlights) {
    const firstLine = highlights.split("\n")[0]?.trim() ?? "";
    if (firstLine.toLowerCase().startsWith("period:")) {
      const raw = firstLine.slice("period:".length).trim();
      return raw || null;
    }
  }

  return null;
}

function extractHighlightsBullets(highlights: string | null): string[] {
  if (!highlights) {
    return [];
  }

  return highlights
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.toLowerCase().startsWith("period:"))
    .map((line) => line.replace(/^[-*•]\s*/, ""));
}

function formatDateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function normalizeId(value: string): string {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "untitled";
}

function extractTitle(properties: Record<string, unknown>, key: string): string | null {
  const prop = properties[key];
  if (!isPlainObject(prop) || !Array.isArray(prop.title)) {
    return null;
  }

  const plain = prop.title
    .map((item) => {
      if (!isPlainObject(item)) {
        return "";
      }
      return typeof item.plain_text === "string" ? item.plain_text : "";
    })
    .join("")
    .trim();

  return plain || null;
}

function extractRichText(properties: Record<string, unknown>, key: string): string | null {
  const prop = properties[key];
  if (!isPlainObject(prop) || !Array.isArray(prop.rich_text)) {
    return null;
  }

  const plain = prop.rich_text
    .map((item) => {
      if (!isPlainObject(item)) {
        return "";
      }
      return typeof item.plain_text === "string" ? item.plain_text : "";
    })
    .join("")
    .trim();

  return plain || null;
}

function extractSelectName(properties: Record<string, unknown>, key: string): string | null {
  const prop = properties[key];
  if (!isPlainObject(prop) || !isPlainObject(prop.select)) {
    return null;
  }

  return typeof prop.select.name === "string" ? prop.select.name : null;
}

function extractMultiSelectNames(properties: Record<string, unknown>, key: string): string[] {
  const prop = properties[key];
  if (!isPlainObject(prop) || !Array.isArray(prop.multi_select)) {
    return [];
  }

  return prop.multi_select
    .map((item) => {
      if (!isPlainObject(item)) {
        return "";
      }
      return typeof item.name === "string" ? item.name.trim() : "";
    })
    .filter((name) => name.length > 0);
}

function extractNumber(properties: Record<string, unknown>, key: string): number | null {
  const prop = properties[key];
  if (!isPlainObject(prop) || typeof prop.number !== "number") {
    return null;
  }
  return prop.number;
}

function extractDateStart(properties: Record<string, unknown>, key: string): string | null {
  const prop = properties[key];
  if (!isPlainObject(prop) || !isPlainObject(prop.date)) {
    return null;
  }

  return typeof prop.date.start === "string" ? prop.date.start : null;
}

function extractCheckbox(properties: Record<string, unknown>, key: string): boolean {
  const prop = properties[key];
  if (!isPlainObject(prop) || typeof prop.checkbox !== "boolean") {
    return false;
  }
  return prop.checkbox;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
