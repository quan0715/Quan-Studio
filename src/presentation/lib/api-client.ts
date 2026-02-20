import type { ApiResponse } from "@/presentation/types/api";
import { parseApiResponse } from "@/presentation/lib/parse-api-response";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

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

    return parseApiResponse<T>(response);
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
