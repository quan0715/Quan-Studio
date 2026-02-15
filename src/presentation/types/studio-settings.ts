export type NotionModelTemplate = string;

export type NotionModelTemplateInfoDto = {
  id: NotionModelTemplate;
  label: string;
  defaultDisplayName: string;
  schemaSource: string | null;
};

export type RegisteredModelDto = {
  template: NotionModelTemplate;
  displayName: string;
  configuredDataSourceId: string | null;
};

export type SourcePageDataSourceCandidateDto = {
  databaseId: string;
  databaseTitle: string;
  dataSourceId: string;
  url: string | null;
};

export type NotionModelSettingsDto = {
  sourcePage: {
    id: string;
    configured: boolean;
  };
  models: RegisteredModelDto[];
  availableTemplates: NotionModelTemplateInfoDto[];
  candidates: SourcePageDataSourceCandidateDto[];
  meta: {
    generatedAt: string;
    candidateCount: number;
  };
};

export type NotionSchemaFieldCheckDto = {
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

export type NotionSchemaMappingReportDto = {
  source: string;
  dataSourceId: string;
  configured: boolean;
  ok: boolean;
  message: string;
  checks: NotionSchemaFieldCheckDto[];
  availableProperties: Array<{
    name: string;
    type: string;
  }>;
};

export type NotionSchemaMappingResultDto = {
  generatedAt: string;
  reports: NotionSchemaMappingReportDto[];
};
