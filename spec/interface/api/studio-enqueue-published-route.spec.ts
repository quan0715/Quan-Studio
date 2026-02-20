// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockedContainer = {
  enqueuePublishedNotionSyncJobsUseCase: {
    execute: vi.fn(),
  },
};

vi.mock("@/interface/container", () => ({
  getContainer: () => mockedContainer,
}));

describe("Studio enqueue published route", () => {
  const originalSecret = process.env.STUDIO_SESSION_SECRET;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.STUDIO_SESSION_SECRET = "test-internal-secret";
    mockedContainer.enqueuePublishedNotionSyncJobsUseCase.execute.mockResolvedValue({
      totalPublished: 2,
      enqueued: 2,
      skipped: 0,
      errors: [],
    });
  });

  afterEach(() => {
    process.env.STUDIO_SESSION_SECRET = originalSecret;
  });

  it("returns 401 when internal token is missing", async () => {
    const { POST } = await import("@/app/api/studio/sync-jobs/enqueue-published/route");

    const response = await POST(
      new Request("http://localhost/api/studio/sync-jobs/enqueue-published", {
        method: "POST",
      })
    );
    const payload = (await response.json()) as { ok: boolean; error: { code: string } };

    expect(response.status).toBe(401);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("UNAUTHORIZED");
    expect(mockedContainer.enqueuePublishedNotionSyncJobsUseCase.execute).not.toHaveBeenCalled();
  });

  it("returns 200 when internal token is valid", async () => {
    const { POST } = await import("@/app/api/studio/sync-jobs/enqueue-published/route");

    const response = await POST(
      new Request("http://localhost/api/studio/sync-jobs/enqueue-published", {
        method: "POST",
        headers: {
          "x-studio-internal-token": "test-internal-secret",
        },
      })
    );
    const payload = (await response.json()) as {
      ok: boolean;
      data: { totalPublished: number; enqueued: number; skipped: number };
    };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.totalPublished).toBe(2);
    expect(payload.data.enqueued).toBe(2);
    expect(mockedContainer.enqueuePublishedNotionSyncJobsUseCase.execute).toHaveBeenCalledTimes(1);
  });
});
