import { apiRequest } from "@/presentation/lib/api-client";
import type { ApiResponse } from "@/presentation/types/api";
import type {
  MigrateResultDto,
  NotionModelDefinitionDto,
  NotionModelDefinitionListDto,
  NotionSchemaMappingResultDto,
  NotionModelSettingsDto,
  NotionModelTemplate,
  ProvisionResultDto,
} from "@/presentation/types/studio-settings";

export async function getNotionModelSettings(): Promise<ApiResponse<NotionModelSettingsDto>> {
  return apiRequest<NotionModelSettingsDto>("/api/studio/settings/notion/models", {
    method: "GET",
  });
}

export async function refreshNotionModelSettings(): Promise<ApiResponse<NotionModelSettingsDto>> {
  return apiRequest<NotionModelSettingsDto>("/api/studio/settings/notion/models/refresh", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function selectNotionModelSource(input: {
  template: NotionModelTemplate;
  dataSourceId: string;
}): Promise<ApiResponse<NotionModelSettingsDto>> {
  return apiRequest<NotionModelSettingsDto>("/api/studio/settings/notion/models/select-source", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function getNotionSchemaMapping(): Promise<ApiResponse<NotionSchemaMappingResultDto>> {
  return apiRequest<NotionSchemaMappingResultDto>("/api/studio/settings/notion/schema-mapping", {
    method: "GET",
  });
}

export async function listNotionModelDefinitions(): Promise<ApiResponse<NotionModelDefinitionListDto>> {
  return apiRequest<NotionModelDefinitionListDto>("/api/studio/settings/notion/model-definitions", {
    method: "GET",
  });
}

export async function createNotionModelDefinition(input: {
  modelKey: string;
  label: string;
  defaultDisplayName: string;
  schemaSource?: string;
  projectionKind?: "flat_list";
  projectionConfigJson?: Record<string, unknown>;
}): Promise<ApiResponse<NotionModelDefinitionDto>> {
  return apiRequest<NotionModelDefinitionDto>("/api/studio/settings/notion/model-definitions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function addNotionModelField(
  modelKey: string,
  input: {
    fieldKey: string;
    appField: string;
    expectedType: string;
    required?: boolean;
    description?: string;
    defaultNotionField?: string | null;
    builtinField?: string | null;
    sortOrder?: number;
  }
): Promise<ApiResponse<NotionModelDefinitionListDto>> {
  return apiRequest<NotionModelDefinitionListDto>(
    `/api/studio/settings/notion/model-definitions/${encodeURIComponent(modelKey)}/fields`,
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );
}

export async function updateNotionModelField(
  modelKey: string,
  fieldKey: string,
  input: {
    fieldKey: string;
    appField: string;
    expectedType: string;
    required?: boolean;
    description?: string;
    defaultNotionField?: string | null;
    builtinField?: string | null;
    sortOrder?: number;
  }
): Promise<ApiResponse<NotionModelDefinitionListDto>> {
  return apiRequest<NotionModelDefinitionListDto>(
    `/api/studio/settings/notion/model-definitions/${encodeURIComponent(modelKey)}/fields/${encodeURIComponent(fieldKey)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    }
  );
}

export async function deleteNotionModelField(
  modelKey: string,
  fieldKey: string
): Promise<ApiResponse<NotionModelDefinitionListDto>> {
  return apiRequest<NotionModelDefinitionListDto>(
    `/api/studio/settings/notion/model-definitions/${encodeURIComponent(modelKey)}/fields/${encodeURIComponent(fieldKey)}`,
    {
      method: "DELETE",
    }
  );
}

export async function updateNotionSchemaMapping(input: {
  source: string;
  mappings: Record<string, string | null>;
}): Promise<ApiResponse<NotionSchemaMappingResultDto>> {
  return apiRequest<NotionSchemaMappingResultDto>("/api/studio/settings/notion/schema-mapping", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function provisionNotionDatabase(input: {
  modelId: string;
  displayName?: string;
}): Promise<ApiResponse<ProvisionResultDto>> {
  return apiRequest<ProvisionResultDto>("/api/studio/settings/notion/models/provision", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function migrateNotionSchema(input: {
  modelId: string;
  allowDelete?: boolean;
  fieldName?: string;
}): Promise<ApiResponse<MigrateResultDto>> {
  return apiRequest<MigrateResultDto>("/api/studio/settings/notion/models/migrate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function loginStudio(input: {
  username: string;
  password: string;
}): Promise<ApiResponse<{ ok: true }>> {
  return apiRequest<{ ok: true }>("/api/studio/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function logoutStudio(): Promise<ApiResponse<{ ok: true }>> {
  return apiRequest<{ ok: true }>("/api/studio/auth/logout", {
    method: "POST",
    body: JSON.stringify({}),
  });
}
