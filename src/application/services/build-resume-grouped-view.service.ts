import {
  NotionModelMapperService,
  toMappedDateRange,
  toMappedNumber,
  toMappedPageIcon,
  toMappedString,
  toMappedStringArray,
} from "@/application/services/notion-model-mapper.service";
import type { ProjectionBuilder, ProjectionBuildInput } from "@/application/services/projection-builder-registry";
import { isPlainObject } from "@/shared/utils/type-guards";
import type {
  NotionModelSchemaMappingDescriptor,
  NotionResumeGroupedProjectionDescriptor,
} from "@/domain/notion-models/model-descriptor";

export type ResumeEntryView = {
  key: string;
  title: string;
  location: string | null;
  period: {
    label: string | null;
    start: string | null;
    end: string | null;
  };
  summary: {
    text: string | null;
    bullets: string[];
  };
  tags: string[];
  media: {
    logoUrl: string | null;
  };
  sort: {
    itemOrder: number | null;
    periodStart: string | null;
  };
};

export type ResumeGroupView = {
  key: string;
  title: string;
  order: number;
  entries: ResumeEntryView[];
};

export type ResumeSectionView = {
  key: string;
  title: string;
  order: number;
  tags: string[];
  groups: ResumeGroupView[];
};

type NotionPageRecord = {
  id?: string;
  object?: string;
  created_time?: string;
  last_edited_time?: string;
  cover?: unknown;
  icon?: unknown;
  properties?: unknown;
  [key: string]: unknown;
};

type ResumeMappedRow = {
  sectionKey: string;
  sectionTitle: string;
  sectionOrder: number;
  groupKey: string;
  groupTitle: string;
  groupOrder: number;
  entry: ResumeEntryView;
};

type ResumeModelWithProjection = {
  schemaSource: string;
  schemaMapping: NotionModelSchemaMappingDescriptor;
  projection: NotionResumeGroupedProjectionDescriptor;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export class BuildResumeGroupedViewService implements ProjectionBuilder {
  constructor(private readonly notionModelMapperService: NotionModelMapperService = new NotionModelMapperService()) {}

  build(input: ProjectionBuildInput): ResumeSectionView[] {
    const model: ResumeModelWithProjection = {
      schemaSource: "",
      schemaMapping: input.schemaMapping,
      projection: input.projection as NotionResumeGroupedProjectionDescriptor,
    };
    const rows = input.pages
      .map((page) => this.toRow(page as NotionPageRecord, model, input.explicitMappings))
      .filter((row): row is ResumeMappedRow => row !== null)
      .sort(compareRows);

    return toSections(rows);
  }

  private toRow(
    page: NotionPageRecord,
    model: ResumeModelWithProjection,
    explicitMappings: Record<string, string>
  ): ResumeMappedRow | null {
    if (page.object !== "page") {
      return null;
    }

    const pageId = typeof page.id === "string" ? page.id : "";
    if (!pageId) {
      return null;
    }

    const projection = model.projection;
    const fields = projection.fields;
    const mappedFields = this.notionModelMapperService.mapPageFields({
      expectations: model.schemaMapping.expectations,
      builtinChecks: model.schemaMapping.builtinChecks ?? [],
      explicitMappings,
      page: {
        created_time: typeof page.created_time === "string" ? page.created_time : "",
        last_edited_time: typeof page.last_edited_time === "string" ? page.last_edited_time : "",
        cover: page.cover,
        icon: page.icon,
        properties: isPlainObject(page.properties) ? page.properties : {},
      },
    });

    const visibility = toMappedString(mappedFields[fields.visibility])?.toLowerCase();
    if (visibility === projection.visibility.privateValue.toLowerCase()) {
      return null;
    }

    const sectionTitle = toMappedString(mappedFields[fields.sectionTitle]) ?? projection.defaults.sectionTitle;
    const groupTitle = toMappedString(mappedFields[fields.groupTitle]) ?? projection.defaults.groupTitle;
    const entryTitle = toMappedString(mappedFields[fields.entryTitle]) ?? projection.defaults.entryTitle;
    const location = toMappedString(mappedFields[fields.location]);
    const summaryText = toMappedString(mappedFields[fields.summaryText]);
    const tags = toMappedStringArray(mappedFields[fields.tags]);
    const dateRange = toMappedDateRange(mappedFields[fields.periodDateRange]);
    const sectionOrder =
      toMappedNumber(mappedFields[fields.sectionOrder]) ??
      defaultSectionOrder(sectionTitle, projection.sectionOrderFallback, projection.defaults.maxOrder);
    const groupOrder = toMappedNumber(mappedFields[fields.groupOrder]) ?? projection.defaults.maxOrder;
    const itemOrder = toMappedNumber(mappedFields[fields.itemOrder]);
    const logoUrl = toMappedPageIcon(mappedFields[fields.logo])?.url ?? null;
    const periodStart = dateRange.start ?? dateRange.end;

    return {
      sectionKey: normalizeKey(sectionTitle),
      sectionTitle,
      sectionOrder,
      groupKey: normalizeKey(groupTitle),
      groupTitle,
      groupOrder,
      entry: {
        key: pageId,
        title: entryTitle,
        location,
        period: {
          label: formatPeriodLabel(dateRange.start, dateRange.end, projection.period.presentLabel),
          start: dateRange.start,
          end: dateRange.end,
        },
        summary: {
          text: summaryText,
          bullets: extractSummaryBullets(summaryText),
        },
        tags,
        media: {
          logoUrl,
        },
        sort: {
          itemOrder,
          periodStart,
        },
      },
    };
  }
}

function toSections(rows: ResumeMappedRow[]): ResumeSectionView[] {
  const sectionMap = new Map<
    string,
    {
      key: string;
      title: string;
      order: number;
      tags: Set<string>;
      groups: Map<string, { key: string; title: string; order: number; entries: ResumeEntryView[] }>;
    }
  >();

  for (const row of rows) {
    let section = sectionMap.get(row.sectionKey);
    if (!section) {
      section = {
        key: row.sectionKey,
        title: row.sectionTitle,
        order: row.sectionOrder,
        tags: new Set<string>(),
        groups: new Map(),
      };
      sectionMap.set(row.sectionKey, section);
    } else {
      section.order = Math.min(section.order, row.sectionOrder);
    }

    for (const tag of row.entry.tags) {
      section.tags.add(tag);
    }

    let group = section.groups.get(row.groupKey);
    if (!group) {
      group = {
        key: row.groupKey,
        title: row.groupTitle,
        order: row.groupOrder,
        entries: [],
      };
      section.groups.set(row.groupKey, group);
    } else {
      group.order = Math.min(group.order, row.groupOrder);
    }

    group.entries.push(row.entry);
  }

  const sections = [...sectionMap.values()]
    .sort((a, b) => compareOrderThenText(a.order, b.order, a.title, b.title))
    .map((section) => ({
      key: section.key,
      title: section.title,
      order: section.order,
      tags: [...section.tags.values()].sort((a, b) => a.localeCompare(b)),
      groups: [...section.groups.values()]
        .sort((a, b) => compareOrderThenText(a.order, b.order, a.title, b.title))
        .map((group) => ({
          key: group.key,
          title: group.title,
          order: group.order,
          entries: [...group.entries].sort(compareEntries),
        })),
    }));

  return sections;
}

function compareRows(a: ResumeMappedRow, b: ResumeMappedRow): number {
  const sectionCmp = compareOrderThenText(a.sectionOrder, b.sectionOrder, a.sectionTitle, b.sectionTitle);
  if (sectionCmp !== 0) {
    return sectionCmp;
  }

  const groupCmp = compareOrderThenText(a.groupOrder, b.groupOrder, a.groupTitle, b.groupTitle);
  if (groupCmp !== 0) {
    return groupCmp;
  }

  return compareEntries(a.entry, b.entry);
}

function compareEntries(a: ResumeEntryView, b: ResumeEntryView): number {
  if (a.sort.itemOrder !== null && b.sort.itemOrder !== null && a.sort.itemOrder !== b.sort.itemOrder) {
    return a.sort.itemOrder - b.sort.itemOrder;
  }
  if (a.sort.itemOrder !== null && b.sort.itemOrder === null) {
    return -1;
  }
  if (a.sort.itemOrder === null && b.sort.itemOrder !== null) {
    return 1;
  }

  const aTimestamp = parseIsoToTimestamp(a.sort.periodStart);
  const bTimestamp = parseIsoToTimestamp(b.sort.periodStart);
  if (aTimestamp !== bTimestamp) {
    return bTimestamp - aTimestamp;
  }

  return a.title.localeCompare(b.title);
}

function compareOrderThenText(aOrder: number, bOrder: number, aText: string, bText: string): number {
  if (aOrder !== bOrder) {
    return aOrder - bOrder;
  }

  return aText.localeCompare(bText);
}

function defaultSectionOrder(
  sectionTitle: string,
  fallbackOrders: Record<string, number>,
  maxOrder: number
): number {
  const normalized = normalizeKey(sectionTitle);
  return fallbackOrders[normalized] ?? maxOrder;
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

function normalizeKey(value: string): string {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "untitled";
}

function formatPeriodLabel(
  start: string | null,
  end: string | null,
  presentLabel: string
): string | null {
  const startLabel = start ? formatDateLabel(start) : null;
  const endLabel = end ? formatDateLabel(end) : null;

  if (startLabel && endLabel) {
    return `${startLabel} - ${endLabel}`;
  }
  if (startLabel && !endLabel) {
    return `${startLabel} - ${presentLabel}`;
  }
  if (startLabel) {
    return startLabel;
  }
  if (endLabel) {
    return endLabel;
  }

  return null;
}

function formatDateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
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

  return lines
    .map((line) => line.replace(/^[-*•]\s*/, ""))
    .filter((line) => line.length > 0);
}
