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
  logoUrl: string | null;
  summary: string | null;
  period: string | null;
  periodSortIso: string | null;
  bullets: string[];
  tags: string[];
  sectionOrder: number;
  groupOrder: number;
  itemOrder: number | null;
};

export type ResumeItemOutput = {
  id: string;
  title: string;
  logoUrl?: string;
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
const DEFAULT_SECTION_ORDER: Record<string, number> = {
  about: 10,
  "work-experience": 20,
  experience: 20,
  projects: 30,
  project: 30,
  education: 40,
  skills: 50,
  awards: 60,
  award: 60,
  certifications: 70,
  certification: 70,
};

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
      .sort(compareResumeRows);

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
  const logoUrl = extractFileObjectUrl(page.icon);
  const summary = extractRichText(properties, "Summary");
  const periodData = extractPeriodData(properties);
  const period = periodData.label;
  const periodSortIso = periodData.sortIso;
  const bullets = extractSummaryBullets(summary);
  const tags = extractMultiSelectNames(properties, "Tags");
  const sectionOrder = extractNumber(properties, "Section Order") ?? defaultSectionOrder(section);
  const groupOrder = extractNumber(properties, "Group Order") ?? Number.MAX_SAFE_INTEGER;
  const itemOrder = extractNumber(properties, "Item Order");

  return {
    pageId,
    section,
    group,
    name,
    logoUrl,
    summary,
    period,
    periodSortIso,
    bullets,
    tags,
    sectionOrder,
    groupOrder,
    itemOrder,
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
  if (row.logoUrl) {
    item.logoUrl = row.logoUrl;
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

function compareResumeRows(a: ResumeRow, b: ResumeRow): number {
  if (a.sectionOrder !== b.sectionOrder) {
    return a.sectionOrder - b.sectionOrder;
  }
  if (a.section !== b.section) {
    return a.section.localeCompare(b.section);
  }

  if (a.groupOrder !== b.groupOrder) {
    return a.groupOrder - b.groupOrder;
  }
  if (a.group !== b.group) {
    return a.group.localeCompare(b.group);
  }

  if (a.itemOrder !== null && b.itemOrder !== null && a.itemOrder !== b.itemOrder) {
    return a.itemOrder - b.itemOrder;
  }
  if (a.itemOrder !== null && b.itemOrder === null) {
    return -1;
  }
  if (a.itemOrder === null && b.itemOrder !== null) {
    return 1;
  }

  const aTimestamp = parseIsoToTimestamp(a.periodSortIso);
  const bTimestamp = parseIsoToTimestamp(b.periodSortIso);
  if (aTimestamp !== bTimestamp) {
    return bTimestamp - aTimestamp;
  }

  return a.name.localeCompare(b.name);
}

function extractPeriodData(properties: Record<string, unknown>): { label: string | null; sortIso: string | null } {
  const range = extractDateRange(properties, "Date");
  if (range.start || range.end) {
    return {
      label: formatPeriodLabel(range.start, range.end),
      sortIso: range.start ?? range.end,
    };
  }

  return { label: null, sortIso: null };
}

function extractSummaryBullets(summary: string | null): string[] {
  if (!summary) {
    return [];
  }

  const lines = summary
    .split("\n")
    .map((line) => line.trim());

  if (lines.length === 0) {
    return [];
  }

  const hasExplicitBullets = lines.some((line) => /^[-*•]\s+/.test(line));
  if (!hasExplicitBullets && lines.length === 1) {
    return [];
  }

  return lines.map((line) => line.replace(/^[-*•]\s*/, ""));
}

function formatDateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function formatPeriodLabel(start: string | null, end: string | null): string | null {
  const startLabel = start ? formatDateLabel(start) : null;
  const endLabel = end ? formatDateLabel(end) : null;

  if (startLabel && endLabel) {
    return `${startLabel} - ${endLabel}`;
  }
  if (startLabel && !endLabel) {
    return `${startLabel} - Present`;
  }
  if (startLabel) {
    return startLabel;
  }
  if (endLabel) {
    return endLabel;
  }

  return null;
}

function parseIsoToTimestamp(value: string | null): number {
  if (!value) {
    return Number.MIN_SAFE_INTEGER;
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return Number.MIN_SAFE_INTEGER;
  }

  return parsed;
}

function defaultSectionOrder(section: string): number {
  const normalized = normalizeId(section);
  return DEFAULT_SECTION_ORDER[normalized] ?? Number.MAX_SAFE_INTEGER;
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

function extractFileObjectUrl(value: unknown): string | null {
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

  if (value.type === "file_upload" && isPlainObject(value.file_upload)) {
    const url = value.file_upload.url;
    return typeof url === "string" ? url : null;
  }

  if (value.type === "custom_emoji" && isPlainObject(value.custom_emoji)) {
    const url = value.custom_emoji.url;
    return typeof url === "string" ? url : null;
  }

  const rawUrl = value.url;
  if (typeof rawUrl === "string") {
    return rawUrl;
  }

  return null;
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

function extractDateRange(
  properties: Record<string, unknown>,
  key: string
): { start: string | null; end: string | null } {
  const prop = properties[key];
  if (!isPlainObject(prop) || !isPlainObject(prop.date)) {
    return { start: null, end: null };
  }

  const start = typeof prop.date.start === "string" ? prop.date.start : null;
  const end = typeof prop.date.end === "string" ? prop.date.end : null;
  return { start, end };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
