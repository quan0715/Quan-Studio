import type { TypedFieldValue } from "@/presentation/types/notion-model-query";
import type { ResumeEntry, ResumeSection } from "@/presentation/types/resume";

export function toResumeSections(rows: Array<Record<string, TypedFieldValue>>): ResumeSection[] {
  type TempSection = {
    key: string;
    title: string;
    order: number;
    tags: Set<string>;
    groups: Map<string, { key: string; title: string; order: number; entries: ResumeEntry[] }>;
  };

  const sectionMap = new Map<string, TempSection>();
  const maxOrder = Number.MAX_SAFE_INTEGER;
  const sectionOrderFallback: Record<string, number> = {
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

  for (const row of rows) {
    const visibility = toStringValue(row["resume.visibility"])?.toLowerCase();
    if (visibility === "private") {
      continue;
    }

    const sectionTitle = toStringValue(row["resume.section"]) ?? "General";
    const groupTitle = toStringValue(row["resume.group"]) ?? "General";
    const entryTitle = toStringValue(row["resume.name"]) ?? "Untitled";
    const dateRange = toDateRange(row["resume.date"]);
    const sectionOrder =
      toNumberValue(row["resume.sectionOrder"]) ??
      sectionOrderFallback[normalizeKey(sectionTitle)] ??
      maxOrder;
    const groupOrder = toNumberValue(row["resume.groupOrder"]) ?? maxOrder;
    const itemOrder = toNumberValue(row["resume.itemOrder"]);
    const logoUrl = toIconUrl(row["resume.logo"]);
    const summaryText = toStringValue(row["resume.summary"]);
    const tags = toStringArrayValue(row["resume.tags"]);
    const periodStart = dateRange.start ?? dateRange.end;
    const sectionKey = normalizeKey(sectionTitle);
    const groupKey = normalizeKey(groupTitle);

    const entry: ResumeEntry = {
      key:
        toStringValue(row["__pageId"]) ??
        `${sectionKey}:${groupKey}:${entryTitle}:${dateRange.start ?? dateRange.end ?? "na"}`,
      title: entryTitle,
      location: toStringValue(row["resume.location"]),
      period: {
        label: formatPeriodLabel(dateRange.start, dateRange.end),
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
    };

    let section = sectionMap.get(sectionKey);
    if (!section) {
      section = {
        key: sectionKey,
        title: sectionTitle,
        order: sectionOrder,
        tags: new Set(),
        groups: new Map(),
      };
      sectionMap.set(sectionKey, section);
    } else {
      section.order = Math.min(section.order, sectionOrder);
    }

    tags.forEach((tag) => section.tags.add(tag));

    let group = section.groups.get(groupKey);
    if (!group) {
      group = {
        key: groupKey,
        title: groupTitle,
        order: groupOrder,
        entries: [],
      };
      section.groups.set(groupKey, group);
    } else {
      group.order = Math.min(group.order, groupOrder);
    }

    group.entries.push(entry);
  }

  return [...sectionMap.values()]
    .sort((a, b) => compareOrderThenText(a.order, b.order, a.title, b.title))
    .map((section) => ({
      key: section.key,
      title: section.title,
      order: section.order,
      tags: [...section.tags].sort((a, b) => a.localeCompare(b)),
      groups: [...section.groups.values()]
        .sort((a, b) => compareOrderThenText(a.order, b.order, a.title, b.title))
        .map((group) => ({
          key: group.key,
          title: group.title,
          order: group.order,
          entries: [...group.entries].sort(compareEntries),
        })),
    }));
}

function toStringValue(value: TypedFieldValue | undefined): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function toNumberValue(value: TypedFieldValue | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toStringArrayValue(value: TypedFieldValue | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function toDateRange(value: TypedFieldValue | undefined): { start: string | null; end: string | null } {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "start" in value &&
    "end" in value
  ) {
    return {
      start: typeof value.start === "string" ? value.start : null,
      end: typeof value.end === "string" ? value.end : null,
    };
  }
  return { start: null, end: null };
}

function toIconUrl(value: TypedFieldValue | undefined): string | null {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "url" in value &&
    typeof value.url === "string"
  ) {
    return value.url;
  }
  return null;
}

function normalizeKey(value: string): string {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "untitled";
}

function compareOrderThenText(aOrder: number, bOrder: number, aText: string, bText: string): number {
  if (aOrder !== bOrder) return aOrder - bOrder;
  return aText.localeCompare(bText);
}

function compareEntries(a: ResumeEntry, b: ResumeEntry): number {
  if (a.sort.itemOrder !== null && b.sort.itemOrder !== null && a.sort.itemOrder !== b.sort.itemOrder) {
    return a.sort.itemOrder - b.sort.itemOrder;
  }
  if (a.sort.itemOrder !== null) return -1;
  if (b.sort.itemOrder !== null) return 1;

  const aTime = parseDate(a.sort.periodStart);
  const bTime = parseDate(b.sort.periodStart);
  if (aTime !== bTime) return bTime - aTime;
  return a.title.localeCompare(b.title);
}

function parseDate(value: string | null): number {
  if (!value) return Number.MIN_SAFE_INTEGER;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.MIN_SAFE_INTEGER : parsed;
}

function extractSummaryBullets(summary: string | null): string[] {
  if (!summary) return [];
  return summary
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter((line) => line.length > 0);
}

function formatPeriodLabel(start: string | null, end: string | null): string | null {
  if (!start && !end) return null;
  const startLabel = formatDateLabel(start);
  const endLabel = end ? formatDateLabel(end) : "Present";
  if (!startLabel && !endLabel) return null;
  if (!startLabel) return endLabel;
  if (!endLabel) return startLabel;
  return `${startLabel} - ${endLabel}`;
}

function formatDateLabel(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

