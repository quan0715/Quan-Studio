import type {
  NotionBuiltinSchemaCheck,
  NotionSchemaFieldExpectation,
} from "@/domain/notion-models/model-descriptor";

export type DataSourceProperty = {
  name: string;
  type: string;
};

export type MappedDateRangeValue = {
  start: string | null;
  end: string | null;
};

export type MappedPageIconValue = {
  emoji: string | null;
  url: string | null;
};

export type NotionSchemaFieldCheck = {
  appField: string;
  description: string;
  required: boolean;
  expectedNotionField: string;
  expectedType: string;
  selectedNotionField: string | null;
  matchedName: string | null;
  actualType: string | null;
  mappedExplicitly: boolean;
  status: "ok" | "missing_required" | "missing_optional" | "type_mismatch";
  message: string;
};

export type NotionSchemaEvaluation = {
  checks: NotionSchemaFieldCheck[];
  requiredMissingCount: number;
  mismatchCount: number;
  ok: boolean;
};

export type StoredNotionSchemaFieldMapping = {
  version: 1;
  sources: Record<string, Record<string, string>>;
};

const EMPTY_MAPPING: StoredNotionSchemaFieldMapping = {
  version: 1,
  sources: Object.create(null) as Record<string, Record<string, string>>,
};

type NotionPageLike = {
  created_time: string;
  last_edited_time: string;
  cover?: unknown;
  icon?: unknown;
  properties: Record<string, unknown>;
};

export class NotionModelMapperService {
  evaluateSchema(input: {
    expectations: NotionSchemaFieldExpectation[];
    builtinChecks: NotionBuiltinSchemaCheck[];
    properties: DataSourceProperty[];
    explicitMappings: Record<string, string>;
  }): NotionSchemaEvaluation {
    const checks = [
      ...evaluateExpectations(input.expectations, input.properties, input.explicitMappings),
      ...buildBuiltinAssetChecks(input.builtinChecks),
    ];
    const requiredMissingCount = checks.filter((item) => item.status === "missing_required").length;
    const mismatchCount = checks.filter((item) => item.status === "type_mismatch").length;
    return {
      checks,
      requiredMissingCount,
      mismatchCount,
      ok: requiredMissingCount === 0 && mismatchCount === 0,
    };
  }

  buildMissingConfigChecks(input: {
    expectations: NotionSchemaFieldExpectation[];
    explicitMappings: Record<string, string>;
  }): NotionSchemaFieldCheck[] {
    return input.expectations.map((item) => ({
      appField: item.appField,
      description: item.description,
      required: item.required,
      expectedNotionField: item.notionField,
      expectedType: item.expectedType,
      selectedNotionField: normalizeFieldName(input.explicitMappings[item.appField] ?? null),
      matchedName: null,
      actualType: null,
      mappedExplicitly: Boolean(normalizeFieldName(input.explicitMappings[item.appField] ?? null)),
      status: item.required ? "missing_required" : "missing_optional",
      message: item.required ? "Missing required property." : "Optional property not configured.",
    }));
  }

  mapPageFields(input: {
    expectations: NotionSchemaFieldExpectation[];
    builtinChecks?: NotionBuiltinSchemaCheck[];
    explicitMappings: Record<string, string>;
    page: NotionPageLike;
  }): Record<string, unknown> {
    const mapped: Record<string, unknown> = {};

    for (const expectation of input.expectations) {
      const selected = resolveSelectedNotionField(expectation, input.explicitMappings);
      mapped[expectation.appField] = extractPropertyValueByExpectedType(
        input.page.properties,
        selected,
        expectation.expectedType
      );
    }

    for (const builtin of input.builtinChecks ?? []) {
      mapped[builtin.appField] = extractBuiltinFieldValue(input.page, builtin.notionField);
    }

    return mapped;
  }
}

export function parseStoredNotionSchemaFieldMapping(raw: string): StoredNotionSchemaFieldMapping {
  if (!raw.trim()) {
    return EMPTY_MAPPING;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isPlainObject(parsed)) {
      return EMPTY_MAPPING;
    }

    const rawSources = isPlainObject(parsed.sources) ? parsed.sources : {};
    const normalizedSources: Record<string, Record<string, string>> = Object.create(null) as Record<
      string,
      Record<string, string>
    >;

    for (const [source, sourceMapping] of Object.entries(rawSources)) {
      const normalizedSource = normalizeFieldName(source);
      if (!normalizedSource) {
        continue;
      }
      normalizedSources[normalizedSource] = normalizeSourceMapping(sourceMapping);
    }

    return {
      version: 1,
      sources: normalizedSources,
    };
  } catch {
    return EMPTY_MAPPING;
  }
}

export function toDataSourceProperties(propertiesValue: Record<string, unknown> | undefined): DataSourceProperty[] {
  if (!propertiesValue) {
    return [];
  }

  const properties: DataSourceProperty[] = [];
  for (const [name, value] of Object.entries(propertiesValue)) {
    if (!isPlainObject(value)) {
      continue;
    }

    properties.push({
      name,
      type: typeof value.type === "string" ? value.type : "unknown",
    });
  }

  properties.sort((a, b) => a.name.localeCompare(b.name));

  return properties;
}

function normalizeSourceMapping(value: unknown): Record<string, string> {
  if (!isPlainObject(value)) {
    return {};
  }

  const result: Record<string, string> = {};
  for (const [appField, notionField] of Object.entries(value)) {
    const normalizedField = normalizeFieldName(notionField);
    if (!normalizedField) {
      continue;
    }
    result[appField] = normalizedField;
  }
  return result;
}

function normalizeFieldName(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function resolveSelectedNotionField(
  expectation: NotionSchemaFieldExpectation,
  explicitMappings: Record<string, string>
): string {
  return normalizeFieldName(explicitMappings[expectation.appField] ?? null) ?? expectation.notionField;
}

function buildBuiltinAssetChecks(
  builtinChecks: NotionBuiltinSchemaCheck[]
): NotionSchemaFieldCheck[] {
  return builtinChecks.map((item) => ({
    appField: item.appField,
    description: item.description,
    required: false,
    expectedNotionField: item.notionField,
    expectedType: item.expectedType,
    selectedNotionField: null,
    matchedName: item.notionField,
    actualType: item.expectedType,
    mappedExplicitly: false,
    status: "ok",
    message: item.message,
  }));
}

function evaluateExpectations(
  expectations: NotionSchemaFieldExpectation[],
  properties: DataSourceProperty[],
  explicitMappings: Record<string, string>
): NotionSchemaFieldCheck[] {
  const exactMap = new Map(properties.map((item) => [item.name, item]));
  const lowerMap = new Map(properties.map((item) => [item.name.toLowerCase(), item]));

  return expectations.map((expectation) => {
    const selectedNotionField = normalizeFieldName(explicitMappings[expectation.appField] ?? null);

    if (selectedNotionField) {
      const selected = exactMap.get(selectedNotionField) ?? null;
      if (!selected) {
        return {
          appField: expectation.appField,
          description: expectation.description,
          required: expectation.required,
          expectedNotionField: expectation.notionField,
          expectedType: expectation.expectedType,
          selectedNotionField,
          matchedName: selectedNotionField,
          actualType: null,
          mappedExplicitly: true,
          status: expectation.required ? "missing_required" : "missing_optional",
          message: `Mapped Notion field "${selectedNotionField}" was not found in current data source.`,
        };
      }

      const typeMatched = expectation.expectedType === selected.type;
      return {
        appField: expectation.appField,
        description: expectation.description,
        required: expectation.required,
        expectedNotionField: expectation.notionField,
        expectedType: expectation.expectedType,
        selectedNotionField,
        matchedName: selected.name,
        actualType: selected.type,
        mappedExplicitly: true,
        status: typeMatched ? "ok" : "type_mismatch",
        message: typeMatched
          ? "Mapped correctly."
          : `Property type mismatch. Expected ${expectation.expectedType} but got ${selected.type}.`,
      };
    }

    const matched = exactMap.get(expectation.notionField) ?? null;

    if (!matched) {
      const nearMatch = lowerMap.get(expectation.notionField.toLowerCase());
      const nearMatchHint = nearMatch ? ` Similar property found: ${nearMatch.name}.` : "";

      return {
        appField: expectation.appField,
        description: expectation.description,
        required: expectation.required,
        expectedNotionField: expectation.notionField,
        expectedType: expectation.expectedType,
        selectedNotionField: null,
        matchedName: null,
        actualType: null,
        mappedExplicitly: false,
        status: expectation.required ? "missing_required" : "missing_optional",
        message: expectation.required
          ? `Missing required property.${nearMatchHint}`
          : `Optional property not configured.${nearMatchHint}`,
      };
    }

    const typeMatched = expectation.expectedType === matched.type;
    return {
      appField: expectation.appField,
      description: expectation.description,
      required: expectation.required,
      expectedNotionField: expectation.notionField,
      expectedType: expectation.expectedType,
      selectedNotionField: null,
      matchedName: matched.name,
      actualType: matched.type,
      mappedExplicitly: false,
      status: typeMatched ? "ok" : "type_mismatch",
      message: typeMatched
        ? "Mapped correctly (auto matched)."
        : `Property type mismatch. Expected ${expectation.expectedType} but got ${matched.type}.`,
    };
  });
}

function extractPropertyValueByExpectedType(
  properties: Record<string, unknown>,
  fieldName: string,
  expectedType: string
): unknown {
  const property = properties[fieldName];
  if (!isPlainObject(property)) {
    return null;
  }

  switch (expectedType) {
    case "title":
      return optionalText(richTextToPlain(asArray(property.title)));
    case "rich_text":
      return optionalText(richTextToPlain(asArray(property.rich_text)));
    case "select":
      return optionalText(extractSelectName(property.select));
    case "status":
      return optionalText(extractSelectName(property.status) ?? extractSelectName(property.select));
    case "multi_select":
      return extractMultiSelectNames(property.multi_select);
    case "number":
      return typeof property.number === "number" ? property.number : null;
    case "date":
      return extractDateRangeValue(property.date);
    case "checkbox":
      return typeof property.checkbox === "boolean" ? property.checkbox : null;
    case "url":
      return optionalText(typeof property.url === "string" ? property.url : null);
    case "email":
      return optionalText(typeof property.email === "string" ? property.email : null);
    case "phone_number":
      return optionalText(typeof property.phone_number === "string" ? property.phone_number : null);
    default:
      return null;
  }
}

function extractBuiltinFieldValue(page: NotionPageLike, builtinField: string): unknown {
  switch (builtinField) {
    case "page.icon":
      return extractPageIcon(page.icon);
    case "page.cover":
      return extractPageCoverUrl(page.cover);
    case "page.created_time":
      return normalizeNotionTimestamp(page.created_time);
    case "page.last_edited_time":
      return normalizeNotionTimestamp(page.last_edited_time);
    default:
      return null;
  }
}

function extractPageCoverUrl(cover: unknown): string | null {
  if (!isPlainObject(cover)) {
    return null;
  }

  if (cover.type === "external" && isPlainObject(cover.external)) {
    const url = cover.external.url;
    return typeof url === "string" ? url : null;
  }

  if (cover.type === "file" && isPlainObject(cover.file)) {
    const url = cover.file.url;
    return typeof url === "string" ? url : null;
  }

  return null;
}

function extractPageIcon(icon: unknown): { emoji: string | null; url: string | null } | null {
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

function normalizeNotionTimestamp(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return trimmed;
  }
  return date.toISOString();
}

function extractDateRangeValue(value: unknown): MappedDateRangeValue {
  if (!isPlainObject(value)) {
    return {
      start: null,
      end: null,
    };
  }
  const start = typeof value.start === "string" && value.start.trim().length > 0 ? value.start : null;
  const end = typeof value.end === "string" && value.end.trim().length > 0 ? value.end : null;
  return {
    start,
    end,
  };
}

function extractSelectName(value: unknown): string | null {
  if (!isPlainObject(value)) {
    return null;
  }
  const name = value.name;
  return typeof name === "string" ? name : null;
}

function extractMultiSelectNames(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!isPlainObject(item)) {
        return "";
      }
      const name = item.name;
      return typeof name === "string" ? name.trim() : "";
    })
    .filter((name) => name.length > 0);
}

function richTextToPlain(items: unknown[]): string {
  return items
    .map((item) => {
      if (!isPlainObject(item)) {
        return "";
      }
      const plainText = item.plain_text;
      return typeof plainText === "string" ? plainText : "";
    })
    .join("");
}

function optionalText(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function toMappedString(value: unknown): string | null {
  return optionalText(typeof value === "string" ? value : null);
}

export function toMappedNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function toMappedStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

export function toMappedDateRange(value: unknown): MappedDateRangeValue {
  if (
    isPlainObject(value) &&
    ("start" in value || "end" in value)
  ) {
    return {
      start: toMappedString(value.start),
      end: toMappedString(value.end),
    };
  }

  return {
    start: null,
    end: null,
  };
}

export function toMappedPageIcon(value: unknown): MappedPageIconValue | null {
  if (!isPlainObject(value)) {
    return null;
  }

  const emoji = typeof value.emoji === "string" ? value.emoji : null;
  const url = typeof value.url === "string" ? value.url : null;
  if (!emoji && !url) {
    return null;
  }

  return { emoji, url };
}
