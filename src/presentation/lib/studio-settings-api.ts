import { apiRequest } from "@/presentation/lib/api-client";
import type { ApiResponse } from "@/presentation/types/api";
import type {
  NotionDataSourceSettingsDto,
  NotionSchemaMappingResultDto,
  NotionDataSourceTestResultDto,
} from "@/presentation/types/studio-settings";

export async function getStudioNotionSettings(): Promise<ApiResponse<NotionDataSourceSettingsDto>> {
  return apiRequest<NotionDataSourceSettingsDto>("/api/studio/settings/notion");
}

export async function updateStudioNotionSettings(input: {
  blogDataSourceId: string;
  resumeDataSourceId: string;
}): Promise<ApiResponse<NotionDataSourceSettingsDto>> {
  return apiRequest<NotionDataSourceSettingsDto>("/api/studio/settings/notion", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function testStudioNotionSettings(): Promise<ApiResponse<NotionDataSourceTestResultDto>> {
  return apiRequest<NotionDataSourceTestResultDto>("/api/studio/settings/notion/test", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function getNotionSchemaMapping(): Promise<ApiResponse<NotionSchemaMappingResultDto>> {
  return apiRequest<NotionSchemaMappingResultDto>("/api/studio/settings/notion/schema-mapping", {
    method: "GET",
  });
}

export async function updateNotionSchemaMapping(input: {
  source: "blog" | "resume";
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
