import { AppError } from "@/application/errors";
import { integrationConfigKeys } from "@/domain/integration-config/integration-config";
import type { IntegrationConfigRepository } from "@/domain/integration-config/integration-config-repository";
import { NotionClient } from "@/infrastructure/notion/notion-client";

type MappingSource = "blog" | "resume";

type FieldExpectation = {
  appField: string;
  notionField: string;
  expectedType: string;
  required: boolean;
  description: string;
};

type DataSourceProperty = {
  name: string;
  type: string;
};

type StoredNotionSchemaFieldMapping = {
  version: 1;
  sources: Record<MappingSource, Record<string, string>>;
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

export type NotionSchemaMappingReport = {
  source: MappingSource;
  dataSourceId: string;
  configured: boolean;
  ok: boolean;
  message: string;
  checks: NotionSchemaFieldCheck[];
  availableProperties: DataSourceProperty[];
};

export type NotionSchemaMappingOutput = {
  generatedAt: string;
  reports: NotionSchemaMappingReport[];
};

type UpdateNotionSchemaMappingInput = {
  source: MappingSource;
  mappings: Record<string, string | null>;
};

const EMPTY_MAPPING: StoredNotionSchemaFieldMapping = {
  version: 1,
  sources: {
    blog: {},
    resume: {},
  },
};

const BLOG_EXPECTATIONS: FieldExpectation[] = [
  {
    appField: "post.title",
    notionField: "Name",
    expectedType: "title",
    required: true,
    description: "文章標題",
  },
  {
    appField: "post.slug",
    notionField: "Slug",
    expectedType: "rich_text",
    required: false,
    description: "網址 slug（可選，未提供會自動生成）",
  },
  {
    appField: "post.status",
    notionField: "Status",
    expectedType: "select",
    required: false,
    description: "文章狀態（published / draft）",
  },
  {
    appField: "post.excerpt",
    notionField: "Excerpt",
    expectedType: "rich_text",
    required: false,
    description: "摘要",
  },
  {
    appField: "post.tags",
    notionField: "Tags",
    expectedType: "multi_select",
    required: false,
    description: "標籤",
  },
  {
    appField: "sync.status",
    notionField: "Sync Status",
    expectedType: "status",
    required: true,
    description: "同步流程狀態欄位（IDLE/Processing/Success/Failed）",
  },
];

const RESUME_EXPECTATIONS: FieldExpectation[] = [
  {
    appField: "resume.name",
    notionField: "Name",
    expectedType: "title",
    required: true,
    description: "履歷 item 名稱",
  },
  {
    appField: "resume.section",
    notionField: "Section",
    expectedType: "select",
    required: false,
    description: "區塊分類",
  },
  {
    appField: "resume.group",
    notionField: "Group",
    expectedType: "rich_text",
    required: false,
    description: "群組名稱",
  },
  {
    appField: "resume.summary",
    notionField: "Summary",
    expectedType: "rich_text",
    required: false,
    description: "描述與條列",
  },
  {
    appField: "resume.date",
    notionField: "Date",
    expectedType: "date",
    required: false,
    description: "期間",
  },
  {
    appField: "resume.tags",
    notionField: "Tags",
    expectedType: "multi_select",
    required: false,
    description: "關鍵字",
  },
  {
    appField: "resume.sectionOrder",
    notionField: "Section Order",
    expectedType: "number",
    required: false,
    description: "區塊排序",
  },
  {
    appField: "resume.groupOrder",
    notionField: "Group Order",
    expectedType: "number",
    required: false,
    description: "群組排序",
  },
  {
    appField: "resume.itemOrder",
    notionField: "Item Order",
    expectedType: "number",
    required: false,
    description: "項目排序",
  },
  {
    appField: "resume.visibility",
    notionField: "Visibility",
    expectedType: "select",
    required: false,
    description: "可見性（private 會被隱藏）",
  },
];

export class GetNotionSchemaMappingUseCase {
  constructor(
    private readonly notionClient: NotionClient,
    private readonly integrationConfigRepository: IntegrationConfigRepository
  ) {}

  async execute(): Promise<NotionSchemaMappingOutput> {
    const configs = await this.integrationConfigRepository.findByKeys([
      integrationConfigKeys.notionBlogDataSourceId,
      integrationConfigKeys.notionResumeDataSourceId,
      integrationConfigKeys.notionSchemaFieldMapping,
    ]);
    const map = new Map(configs.map((config) => [config.key, config.value.trim()]));

    const blogDataSourceId = map.get(integrationConfigKeys.notionBlogDataSourceId) ?? "";
    const resumeDataSourceId = map.get(integrationConfigKeys.notionResumeDataSourceId) ?? "";
    const storedMapping = parseStoredMapping(map.get(integrationConfigKeys.notionSchemaFieldMapping) ?? "");

    const [blogReport, resumeReport] = await Promise.all([
      this.inspect("blog", blogDataSourceId, BLOG_EXPECTATIONS, storedMapping.sources.blog),
      this.inspect("resume", resumeDataSourceId, RESUME_EXPECTATIONS, storedMapping.sources.resume),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      reports: [blogReport, resumeReport],
    };
  }

  private async inspect(
    source: MappingSource,
    dataSourceId: string,
    expectations: FieldExpectation[],
    explicitMappings: Record<string, string>
  ): Promise<NotionSchemaMappingReport> {
    const normalizedDataSourceId = dataSourceId.trim();
    if (!normalizedDataSourceId) {
      return {
        source,
        dataSourceId: "",
        configured: false,
        ok: false,
        message: "Data source id is not configured.",
        checks: expectations.map((item) => ({
          appField: item.appField,
          description: item.description,
          required: item.required,
          expectedNotionField: item.notionField,
          expectedType: item.expectedType,
          selectedNotionField: normalizeFieldName(explicitMappings[item.appField] ?? null),
          matchedName: null,
          actualType: null,
          mappedExplicitly: Boolean(normalizeFieldName(explicitMappings[item.appField] ?? null)),
          status: item.required ? "missing_required" : "missing_optional",
          message: item.required ? "Missing required property." : "Optional property not configured.",
        })),
        availableProperties: [],
      };
    }

    try {
      const dataSource = await this.notionClient.retrieveDataSource(normalizedDataSourceId);
      const properties = extractDataSourceProperties(dataSource.properties);
      const checks = [
        ...evaluateExpectations(expectations, properties, explicitMappings),
        ...(source === "blog" ? buildBlogBuiltinAssetChecks() : []),
      ];
      const requiredMissingCount = checks.filter((item) => item.status === "missing_required").length;
      const mismatchCount = checks.filter((item) => item.status === "type_mismatch").length;
      const ok = requiredMissingCount === 0 && mismatchCount === 0;

      return {
        source,
        dataSourceId: normalizedDataSourceId,
        configured: true,
        ok,
        message: ok
          ? "Schema mapping is valid."
          : `Found ${requiredMissingCount} missing required field(s), ${mismatchCount} type mismatch(es).`,
        checks,
        availableProperties: properties,
      };
    } catch (error) {
      return {
        source,
        dataSourceId: normalizedDataSourceId,
        configured: true,
        ok: false,
        message: error instanceof Error ? error.message : "Failed to inspect Notion schema.",
        checks: [],
        availableProperties: [],
      };
    }
  }
}

export class UpdateNotionSchemaMappingUseCase {
  constructor(private readonly integrationConfigRepository: IntegrationConfigRepository) {}

  async execute(input: UpdateNotionSchemaMappingInput): Promise<void> {
    const source = input.source;
    if (source !== "blog" && source !== "resume") {
      throw new AppError("VALIDATION_ERROR", "source must be blog or resume");
    }

    const allowedAppFields = new Set(
      (source === "blog" ? BLOG_EXPECTATIONS : RESUME_EXPECTATIONS).map((item) => item.appField)
    );

    const stored = await this.integrationConfigRepository.findByKey(
      integrationConfigKeys.notionSchemaFieldMapping
    );
    const currentMapping = parseStoredMapping(stored?.value ?? "");
    const nextSourceMapping = { ...currentMapping.sources[source] };

    for (const [appField, notionField] of Object.entries(input.mappings)) {
      if (!allowedAppFields.has(appField)) {
        throw new AppError("VALIDATION_ERROR", `invalid appField: ${appField}`);
      }

      const normalizedField = normalizeFieldName(notionField);
      if (!normalizedField) {
        delete nextSourceMapping[appField];
      } else {
        nextSourceMapping[appField] = normalizedField;
      }
    }

    const nextMapping: StoredNotionSchemaFieldMapping = {
      version: 1,
      sources: {
        ...currentMapping.sources,
        [source]: nextSourceMapping,
      },
    };

    await this.integrationConfigRepository.upsert(
      integrationConfigKeys.notionSchemaFieldMapping,
      JSON.stringify(nextMapping)
    );
  }
}

function parseStoredMapping(raw: string): StoredNotionSchemaFieldMapping {
  if (!raw.trim()) {
    return EMPTY_MAPPING;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isPlainObject(parsed)) {
      return EMPTY_MAPPING;
    }

    const sources = isPlainObject(parsed.sources) ? parsed.sources : {};
    return {
      version: 1,
      sources: {
        blog: normalizeSourceMapping(sources.blog),
        resume: normalizeSourceMapping(sources.resume),
      },
    };
  } catch {
    return EMPTY_MAPPING;
  }
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

function buildBlogBuiltinAssetChecks(): NotionSchemaFieldCheck[] {
  return [
    {
      appField: "post.icon",
      description: "文章 icon（使用 Notion 內建 page icon）",
      required: false,
      expectedNotionField: "page.icon",
      expectedType: "builtin",
      selectedNotionField: null,
      matchedName: "page.icon",
      actualType: "builtin",
      mappedExplicitly: false,
      status: "ok",
      message: "Uses Notion built-in icon.",
    },
    {
      appField: "post.cover",
      description: "文章封面（優先使用 Notion 內建 page cover）",
      required: false,
      expectedNotionField: "page.cover",
      expectedType: "builtin",
      selectedNotionField: null,
      matchedName: "page.cover",
      actualType: "builtin",
      mappedExplicitly: false,
      status: "ok",
      message: "Uses Notion built-in cover.",
    },
  ];
}

function evaluateExpectations(
  expectations: FieldExpectation[],
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

function extractDataSourceProperties(
  propertiesValue: Record<string, unknown> | undefined
): DataSourceProperty[] {
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
