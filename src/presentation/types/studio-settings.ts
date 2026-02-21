export type NotionModelTemplate = string;

export type NotionProjectionDto = {
  kind: "flat_list";
  config: Record<string, unknown>;
};

export type NotionModelFieldDto = {
  fieldKey: string;
  appField: string;
  expectedType: string;
  required: boolean;
  description: string;
  defaultNotionField: string | null;
  builtinField: string | null;
  sortOrder: number;
};

export type NotionModelDefinitionDto = {
  modelKey: string;
  label: string;
  defaultDisplayName: string;
  schemaSource: string;
  projectionKind: "flat_list";
  projectionConfigJson: Record<string, unknown>;
  isActive: boolean;
  dataSourceId: string | null;
  fields: NotionModelFieldDto[];
  createdAt: string;
  updatedAt: string;
};

export type NotionModelDefinitionListDto = {
  generatedAt: string;
  models: NotionModelDefinitionDto[];
};

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

export type ProvisionResultDto = {
  databaseId: string;
  dataSourceId: string;
  displayName: string;
};

export type SchemaDiffActionDto =
  | { kind: "add"; fieldName: string; fieldType: string }
  | { kind: "rename"; fromName: string; toName: string }
  | { kind: "delete"; fieldName: string };

export type MigrateResultDto = {
  dataSourceId: string;
  actions: SchemaDiffActionDto[];
  applied: SchemaDiffActionDto[];
  skipped: SchemaDiffActionDto[];
};
