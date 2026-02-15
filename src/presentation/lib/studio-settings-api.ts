import { apiRequest } from "@/presentation/lib/api-client";
import type { ApiResponse } from "@/presentation/types/api";
import type {
  NotionSchemaMappingResultDto,
  NotionModelSettingsDto,
  NotionModelTemplate,
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

export async function updateNotionSchemaMapping(input: {
  source: string;
  mappings: Record<string, string | null>;
}): Promise<ApiResponse<NotionSchemaMappingResultDto>> {
  return apiRequest<NotionSchemaMappingResultDto>("/api/studio/settings/notion/schema-mapping", {
    method: "PATCH",
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
