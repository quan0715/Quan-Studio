import { AppError } from "@/application/errors";
import { integrationConfigKeys } from "@/domain/integration-config/integration-config";
import type { IntegrationConfigRepository } from "@/domain/integration-config/integration-config-repository";
import { env } from "@/infrastructure/config/env";
import {
  fetchNotionEnvSnapshot,
  resolveFirstNotionEnvValue,
  STUDIO_PASSWORD_KEYS,
  STUDIO_USERNAME_KEYS,
} from "@/infrastructure/notion/notion-env-config";
import { NotionClient } from "@/infrastructure/notion/notion-client";

export type NotionDataSourceSettings = {
  blogDataSourceId: string;
  resumeDataSourceId: string;
  source: {
    blog: "database" | "missing";
    resume: "database" | "missing";
  };
};

export type NotionDataSourceTestResult = {
  blog: {
    ok: boolean;
    message: string;
  };
  resume: {
    ok: boolean;
    message: string;
  };
  envConfig: NotionEnvConfigTestResult;
};

export type NotionEnvConfigCheck = {
  credential: "username" | "password";
  notionKey: string;
  keyExists: boolean;
  valuePresent: boolean;
};

export type NotionEnvConfigTestResult = {
  ok: boolean;
  message: string;
  notionEnvDatabaseId: string;
  notionEnvDataSourceId: string | null;
  readable: boolean;
  availableKeys: string[];
  checks: NotionEnvConfigCheck[];
};

type UpdateNotionDataSourceSettingsInput = {
  blogDataSourceId: string;
  resumeDataSourceId: string;
};

export class GetStudioNotionSettingsUseCase {
  constructor(private readonly integrationConfigRepository: IntegrationConfigRepository) {}

  async execute(): Promise<NotionDataSourceSettings> {
    const configs = await this.integrationConfigRepository.findByKeys([
      integrationConfigKeys.notionBlogDataSourceId,
      integrationConfigKeys.notionResumeDataSourceId,
    ]);

    const map = new Map(configs.map((config) => [config.key, config.value.trim()]));
    const blogFromDb = map.get(integrationConfigKeys.notionBlogDataSourceId) ?? "";
    const resumeFromDb = map.get(integrationConfigKeys.notionResumeDataSourceId) ?? "";

    return {
      blogDataSourceId: blogFromDb,
      resumeDataSourceId: resumeFromDb,
      source: {
        blog: blogFromDb ? "database" : "missing",
        resume: resumeFromDb ? "database" : "missing",
      },
    };
  }
}

export class UpdateStudioNotionSettingsUseCase {
  constructor(private readonly integrationConfigRepository: IntegrationConfigRepository) {}

  async execute(input: UpdateNotionDataSourceSettingsInput): Promise<NotionDataSourceSettings> {
    const blogDataSourceId = normalizeDataSourceId(input.blogDataSourceId, "blogDataSourceId");
    const resumeDataSourceId = normalizeDataSourceId(input.resumeDataSourceId, "resumeDataSourceId");

    await this.integrationConfigRepository.upsert(
      integrationConfigKeys.notionBlogDataSourceId,
      blogDataSourceId
    );
    await this.integrationConfigRepository.upsert(
      integrationConfigKeys.notionResumeDataSourceId,
      resumeDataSourceId
    );

    return {
      blogDataSourceId,
      resumeDataSourceId,
      source: {
        blog: "database",
        resume: "database",
      },
    };
  }
}

export class TestStudioNotionSettingsUseCase {
  constructor(
    private readonly notionClient: NotionClient,
    private readonly getStudioNotionSettingsUseCase: GetStudioNotionSettingsUseCase
  ) {}

  async execute(): Promise<NotionDataSourceTestResult> {
    const settings = await this.getStudioNotionSettingsUseCase.execute();

    const [blog, resume, envConfig] = await Promise.all([
      this.testOne(settings.blogDataSourceId, "blog"),
      this.testOne(settings.resumeDataSourceId, "resume"),
      this.testNotionEnvConfig(),
    ]);

    return { blog, resume, envConfig };
  }

  private async testOne(
    dataSourceId: string,
    label: "blog" | "resume"
  ): Promise<{ ok: boolean; message: string }> {
    if (!dataSourceId) {
      return {
        ok: false,
        message: `${label} data source id is missing`,
      };
    }

    try {
      await this.notionClient.queryDataSourceWithId(dataSourceId, 1);
      return {
        ok: true,
        message: "Connection succeeded",
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async testNotionEnvConfig(): Promise<NotionEnvConfigTestResult> {
    const rawNotionEnvDatabaseId = env.notionEnvDatabaseId.trim();
    if (!rawNotionEnvDatabaseId) {
      return {
        ok: false,
        message: "NOTION_ENV_DATABASE_ID is missing",
        notionEnvDatabaseId: "",
        notionEnvDataSourceId: null,
        readable: false,
        availableKeys: [],
        checks: [],
      };
    }

    try {
      const snapshot = await fetchNotionEnvSnapshot(this.notionClient, rawNotionEnvDatabaseId);
      const checks = buildEnvConfigChecks(snapshot.values);
      const failed = checks.filter((item) => !(item.keyExists && item.valuePresent));

      return {
        ok: failed.length === 0,
        message:
          failed.length === 0
            ? "NOTION.ENV validation passed"
            : `NOTION.ENV is missing required credentials: ${failed.map((item) => item.credential).join(", ")}`,
        notionEnvDatabaseId: snapshot.notionEnvDatabaseId,
        notionEnvDataSourceId: snapshot.notionEnvDataSourceId,
        readable: true,
        availableKeys: snapshot.availableKeys,
        checks,
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Unknown error",
        notionEnvDatabaseId: rawNotionEnvDatabaseId,
        notionEnvDataSourceId: null,
        readable: false,
        availableKeys: [],
        checks: [],
      };
    }
  }
}

function normalizeDataSourceId(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new AppError("VALIDATION_ERROR", `${fieldName} is required`);
  }
  return normalized;
}

function buildEnvConfigChecks(envMap: Map<string, string>): NotionEnvConfigCheck[] {
  const usernameValue = resolveFirstNotionEnvValue(envMap, STUDIO_USERNAME_KEYS);
  const passwordValue = resolveFirstNotionEnvValue(envMap, STUDIO_PASSWORD_KEYS);

  return [
    {
      credential: "username",
      notionKey: usernameValue?.key ?? STUDIO_USERNAME_KEYS[0],
      keyExists: Boolean(usernameValue),
      valuePresent: Boolean(usernameValue?.value.trim()),
    },
    {
      credential: "password",
      notionKey: passwordValue?.key ?? STUDIO_PASSWORD_KEYS[0],
      keyExists: Boolean(passwordValue),
      valuePresent: Boolean(passwordValue?.value.trim()),
    },
  ];
}
