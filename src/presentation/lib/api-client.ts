import type { ApiResponse } from "@/presentation/types/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

async function parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (payload && typeof payload === "object" && "ok" in payload) {
    return payload;
  }

  if (response.ok) {
    return {
      ok: true,
      data: payload as T,
    };
  }

  return {
    ok: false,
    error: {
      code: "UNEXPECTED_ERROR",
      message: "Unexpected response format.",
    },
  };
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit
): Promise<ApiResponse<T>> {
  const hasFormDataBody = typeof FormData !== "undefined" && init?.body instanceof FormData;

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...(hasFormDataBody ? {} : { "Content-Type": "application/json" }),
        ...(init?.headers ?? {}),
      },
    });

    return parseResponse<T>(response);
  } catch {
    return {
      ok: false,
      error: {
        code: "NETWORK_ERROR",
        message: "Network error. Please try again.",
      },
    };
  }
}
