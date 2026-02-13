import { apiRequest } from "@/presentation/lib/api-client";
import type { ApiResponse } from "@/presentation/types/api";
import type {
  NotionDataSourceSettingsDto,
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
