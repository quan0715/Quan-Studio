import type { ApiResponse } from "@/presentation/types/api";
import { isPlainObject } from "@/shared/utils/type-guards";

export async function parseApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const rawBody = await response.text().catch(() => "");
  const payload = tryParseJson(rawBody);
  const strictApiResponse = toStrictApiResponse<T>(payload);
  if (strictApiResponse) {
    return strictApiResponse;
  }

  if (response.ok) {
    if (payload !== null) {
      return {
        ok: true,
        data: payload as T,
      };
    }

    if (rawBody.trim().length === 0) {
      return {
        ok: true,
        data: null as T,
      };
    }

    const summary = summarizeBody(rawBody);
    return {
      ok: false,
      error: {
        code: "UNEXPECTED_RESPONSE",
        message: summary
          ? `Expected JSON payload but received non-JSON response. ${summary}`
          : "Expected JSON payload but received non-JSON response.",
      },
    };
  }

  const relaxedApiError = toRelaxedApiError(payload);
  if (relaxedApiError) {
    return relaxedApiError;
  }

  const statusHint = `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;
  const summary = summarizeBody(rawBody);
  return {
    ok: false,
    error: {
      code: "UNEXPECTED_ERROR",
      message: summary
        ? `Unexpected response format (${statusHint}). ${summary}`
        : `Unexpected response format (${statusHint}).`,
    },
  };
}

function tryParseJson(value: string): unknown | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return null;
  }
}

function toStrictApiResponse<T>(value: unknown): ApiResponse<T> | null {
  if (!isPlainObject(value) || typeof value.ok !== "boolean") {
    return null;
  }

  if (value.ok) {
    if (!("data" in value)) {
      return null;
    }
    return {
      ok: true,
      data: value.data as T,
    };
  }

  if (!isPlainObject(value.error)) {
    return null;
  }
  if (typeof value.error.code !== "string" || typeof value.error.message !== "string") {
    return null;
  }

  return {
    ok: false,
    error: {
      code: value.error.code,
      message: value.error.message,
    },
  };
}

function toRelaxedApiError(value: unknown): ApiResponse<never> | null {
  if (!isPlainObject(value) || !isPlainObject(value.error)) {
    return null;
  }
  if (typeof value.error.code !== "string" || typeof value.error.message !== "string") {
    return null;
  }
  return {
    ok: false,
    error: {
      code: value.error.code,
      message: value.error.message,
    },
  };
}

function summarizeBody(value: string): string | null {
  const compact = value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!compact) {
    return null;
  }

  const snippet = compact.length > 160 ? `${compact.slice(0, 160)}...` : compact;
  return `Response snippet: ${snippet}`;
}
