import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { AppError } from "@/application/errors";

vi.mock("@/infrastructure/config/env", () => ({
  env: {
    notionApiToken: "test-token",
    notionApiVersion: "2025-09-03",
  },
}));

const { NotionClient } = await import("@/infrastructure/notion/notion-client");

function jsonResponse(body: unknown, status = 200, headers?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

describe("NotionClient retry behaviour", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  it("retries on 429 then succeeds", async () => {
    const client = new NotionClient({ timeoutMs: 5_000, maxRetries: 2 });
    let callCount = 0;

    globalThis.fetch = vi.fn(async () => {
      callCount++;
      if (callCount === 1) {
        return new Response("rate limited", {
          status: 429,
          headers: { "Retry-After": "0" },
        });
      }
      return jsonResponse({ id: "page-1" });
    }) as typeof fetch;

    const result = await client.retrievePage("page-1");
    expect(result).toEqual({ id: "page-1" });
    expect(callCount).toBe(2);
  });

  it("throws after exhausting retries on 500", async () => {
    const client = new NotionClient({ timeoutMs: 5_000, maxRetries: 1 });

    globalThis.fetch = vi.fn(async () => {
      return new Response("server error", { status: 500 });
    }) as typeof fetch;

    const error = await client.retrievePage("page-1").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).message).toMatch(/status 500/);
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(2);
  });

  it("retries on network error then succeeds", async () => {
    const client = new NotionClient({ timeoutMs: 5_000, maxRetries: 2 });
    let callCount = 0;

    globalThis.fetch = vi.fn(async () => {
      callCount++;
      if (callCount === 1) {
        throw new TypeError("fetch failed");
      }
      return jsonResponse({ id: "db-1" });
    }) as typeof fetch;

    const result = await client.retrieveDatabase("db-1");
    expect(result).toEqual({ id: "db-1" });
    expect(callCount).toBe(2);
  });

  it("does not retry on 4xx (non-429)", async () => {
    const client = new NotionClient({ timeoutMs: 5_000, maxRetries: 2 });

    globalThis.fetch = vi.fn(async () => {
      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    await expect(client.retrievePage("page-1")).rejects.toThrow(/status 404/);
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(1);
  });
});
