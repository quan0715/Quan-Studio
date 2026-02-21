// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/application/errors";

const mockedContainer = {
  queryNotionModelUseCase: {
    execute: vi.fn(),
  },
};

vi.mock("@/interface/container", () => ({
  getContainer: () => mockedContainer,
}));

describe("Public resume route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedContainer.queryNotionModelUseCase.execute.mockResolvedValue({
      meta: {
        modelKey: "resume",
        dataSourceId: "ds-resume",
        generatedAt: "2026-01-01T00:00:00.000Z",
        schemaVersion: 1,
      },
      rows: [],
    });
  });

  it("GET /api/public/resume returns generic model payload", async () => {
    const { GET } = await import("@/app/api/public/resume/route");

    const response = await GET(new Request("http://localhost/api/public/resume?limit=500"));
    const payload = (await response.json()) as {
      ok: boolean;
      data: {
        meta: { generatedAt: string; dataSourceId: string; modelKey: string };
        rows: unknown[];
      };
    };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.meta.dataSourceId).toBe("ds-resume");
    expect(payload.data.meta.modelKey).toBe("resume");
    expect(Array.isArray(payload.data.rows)).toBe(true);
  });

  it("maps VALIDATION_ERROR to 422", async () => {
    mockedContainer.queryNotionModelUseCase.execute.mockRejectedValue(
      new AppError("VALIDATION_ERROR", "data source for model resume is not configured")
    );
    const { GET } = await import("@/app/api/public/resume/route");

    const response = await GET(new Request("http://localhost/api/public/resume"));
    const payload = (await response.json()) as { ok: boolean; error: { code: string } };

    expect(response.status).toBe(422);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("VALIDATION_ERROR");
  });
});
