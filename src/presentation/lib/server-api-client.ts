import { headers } from "next/headers";
import type { ApiResponse } from "@/presentation/types/api";

const DEFAULT_SITE_URL = "http://localhost:3000";

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

async function resolveBaseUrl(): Promise<string> {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "http";

  if (host) {
    return `${proto}://${host}`;
  }

  const envBase =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    DEFAULT_SITE_URL;

  return trimTrailingSlash(envBase);
}

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

export async function serverApiRequest<T>(
  path: string,
  init?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const baseUrl = await resolveBaseUrl();
    const headerStore = await headers();
    const cookie = headerStore.get("cookie");
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { cookie } : {}),
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
