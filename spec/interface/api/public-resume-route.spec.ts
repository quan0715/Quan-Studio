// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/application/errors";

const mockedContainer = {
  listNotionResumeDataSourceUseCase: {
    execute: vi.fn(),
  },
};

vi.mock("@/interface/container", () => ({
  getContainer: () => mockedContainer,
}));

describe("Public resume route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedContainer.listNotionResumeDataSourceUseCase.execute.mockResolvedValue({
      meta: {
        generatedAt: "2026-01-01T00:00:00.000Z",
        dataSourceId: "ds-resume",
      },
      sections: [],
    });
  });

  it("GET /api/public/resume returns grouped resume payload", async () => {
    const { GET } = await import("@/app/api/public/resume/route");

    const response = await GET(new Request("http://localhost/api/public/resume?limit=500"));
    const payload = (await response.json()) as {
      ok: boolean;
      data: {
        meta: { generatedAt: string; dataSourceId: string };
        sections: unknown[];
      };
    };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.meta.dataSourceId).toBe("ds-resume");
    expect(Array.isArray(payload.data.sections)).toBe(true);
  });

  it("maps VALIDATION_ERROR to 422", async () => {
    mockedContainer.listNotionResumeDataSourceUseCase.execute.mockRejectedValue(
      new AppError("VALIDATION_ERROR", "Notion resume data source id is not configured")
    );
    const { GET } = await import("@/app/api/public/resume/route");

    const response = await GET(new Request("http://localhost/api/public/resume"));
    const payload = (await response.json()) as { ok: boolean; error: { code: string } };

    expect(response.status).toBe(422);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("VALIDATION_ERROR");
  });
});

