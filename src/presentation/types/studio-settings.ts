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
