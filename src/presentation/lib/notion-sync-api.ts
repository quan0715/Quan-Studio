import { apiRequest } from "@/presentation/lib/api-client";
import type { ApiError, ApiResponse } from "@/presentation/types/api";
import type {
  NotionSyncJobDto,
  ProcessNextNotionSyncJobResponse,
} from "@/presentation/types/notion-sync";

function toApiError(code: string, message: string): ApiResponse<never> {
  return {
    ok: false,
    error: { code, message },
  };
}

function toApiMessage(error: ApiError["error"]) {
  const isServerError = error.code.startsWith("INTERNAL") || error.code.startsWith("SERVER");
  if (isServerError) {
    return "Server error. Please retry.";
  }

  return error.message;
}

export async function enqueueNotionSyncJob(pageId: string): Promise<ApiResponse<NotionSyncJobDto>> {
  const normalized = pageId.trim();
  if (!normalized) {
    return toApiError("VALIDATION_ERROR", "Page ID is required.");
  }

  const response = await apiRequest<NotionSyncJobDto>("/api/studio/sync-jobs", {
    method: "POST",
    body: JSON.stringify({ pageId: normalized }),
  });

  if (!response.ok) {
    return {
      ok: false,
      error: {
        code: response.error.code,
        message: toApiMessage(response.error),
      },
    };
  }

  return response;
}

export async function retryNotionSyncJob(jobId: string): Promise<ApiResponse<NotionSyncJobDto>> {
  const normalized = jobId.trim();
  if (!normalized) {
    return toApiError("VALIDATION_ERROR", "Job ID is required.");
  }

  const response = await apiRequest<NotionSyncJobDto>(`/api/studio/sync-jobs/${normalized}/retry`, {
    method: "POST",
  });

  if (!response.ok) {
    return {
      ok: false,
      error: {
        code: response.error.code,
        message: toApiMessage(response.error),
      },
    };
  }

  return response;
}

export async function processNextNotionSyncJobOnce(): Promise<ApiResponse<ProcessNextNotionSyncJobResponse>> {
  const response = await apiRequest<ProcessNextNotionSyncJobResponse>("/api/studio/sync-jobs/process-next", {
    method: "POST",
  });

  if (!response.ok) {
    return {
      ok: false,
      error: {
        code: response.error.code,
        message: toApiMessage(response.error),
      },
    };
  }

  return response;
}

export async function getNotionSyncJobs(limit = 50): Promise<ApiResponse<NotionSyncJobDto[]>> {
  const normalizedLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 50;
  const response = await apiRequest<NotionSyncJobDto[]>(
    `/api/studio/sync-jobs?limit=${encodeURIComponent(String(normalizedLimit))}`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    return {
      ok: false,
      error: {
        code: response.error.code,
        message: toApiMessage(response.error),
      },
    };
  }

  return response;
}
