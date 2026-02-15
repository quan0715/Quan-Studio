export type NotionDataSourceSettingsDto = {
  blogDataSourceId: string;
  resumeDataSourceId: string;
  source: {
    blog: "database" | "missing";
    resume: "database" | "missing";
  };
};

export type NotionDataSourceTestResultDto = {
  blog: {
    ok: boolean;
    message: string;
  };
  resume: {
    ok: boolean;
    message: string;
  };
  envConfig: {
    ok: boolean;
    message: string;
    notionEnvDatabaseId: string;
    notionEnvDataSourceId: string | null;
    readable: boolean;
    availableKeys: string[];
    checks: Array<{
      credential: "username" | "password";
      notionKey: string;
      keyExists: boolean;
      valuePresent: boolean;
    }>;
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
  source: "blog" | "resume";
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
