// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/application/errors";

const mockedContainer = {
  getNotionModelSettingsUseCase: {
    execute: vi.fn(),
  },
  selectNotionModelSourceUseCase: {
    execute: vi.fn(),
  },
};

const defaultTemplates = [
  {
    id: "blog",
    label: "Blog",
    defaultDisplayName: "Blog Model",
    schemaSource: "blog",
  },
  {
    id: "resume",
    label: "Resume",
    defaultDisplayName: "Resume Model",
    schemaSource: "resume",
  },
] as const;

function createModelSettings() {
  return {
    sourcePage: { id: "source-page", configured: true },
    availableTemplates: [...defaultTemplates],
    models: [
      { template: "blog", displayName: "Blog Model", configuredDataSourceId: null },
      { template: "resume", displayName: "Resume Model", configuredDataSourceId: null },
    ],
    candidates: [],
    meta: { generatedAt: "2026-01-01T00:00:00.000Z", candidateCount: 0 },
  };
}

vi.mock("@/interface/container", () => ({
  getContainer: () => mockedContainer,
}));

describe("Studio notion model routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedContainer.getNotionModelSettingsUseCase.execute.mockResolvedValue(createModelSettings());
    mockedContainer.selectNotionModelSourceUseCase.execute.mockResolvedValue(undefined);
  });

  it("GET /models returns notion model settings", async () => {
    mockedContainer.getNotionModelSettingsUseCase.execute.mockResolvedValue(createModelSettings());
    const { GET } = await import("@/app/api/studio/settings/notion/models/route");

    const response = await GET(new Request("http://localhost/api/studio/settings/notion/models"));
    const payload = (await response.json()) as { ok: boolean };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(mockedContainer.getNotionModelSettingsUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it("GET /models maps VALIDATION_ERROR to 422", async () => {
    mockedContainer.getNotionModelSettingsUseCase.execute.mockRejectedValue(
      new AppError("VALIDATION_ERROR", "NOTION_SOURCE_PAGE_ID is not configured")
    );
    const { GET } = await import("@/app/api/studio/settings/notion/models/route");

    const response = await GET(new Request("http://localhost/api/studio/settings/notion/models"));
    const payload = (await response.json()) as { ok: boolean; error: { code: string } };

    expect(response.status).toBe(422);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("VALIDATION_ERROR");
  });

  it("PATCH /models/select-source validates payload", async () => {
    const { PATCH } = await import("@/app/api/studio/settings/notion/models/select-source/route");

    const response = await PATCH(
      new Request("http://localhost/api/studio/settings/notion/models/select-source", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ template: "blog", dataSourceId: "" }),
      })
    );

    expect(response.status).toBe(422);
  });

  it("PATCH /models/select-source calls select source use case", async () => {
    mockedContainer.selectNotionModelSourceUseCase.execute.mockResolvedValue(createModelSettings());
    const { PATCH } = await import("@/app/api/studio/settings/notion/models/select-source/route");

    const response = await PATCH(
      new Request("http://localhost/api/studio/settings/notion/models/select-source", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ template: "resume", dataSourceId: "ds-123" }),
      })
    );
    const payload = (await response.json()) as { ok: boolean; error?: { code: string; message: string } };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(mockedContainer.selectNotionModelSourceUseCase.execute).toHaveBeenCalledWith({
      template: "resume",
      dataSourceId: "ds-123",
    });
  });

  it("POST /models/refresh reuses get settings use case", async () => {
    mockedContainer.getNotionModelSettingsUseCase.execute.mockResolvedValue(createModelSettings());
    const { POST } = await import("@/app/api/studio/settings/notion/models/refresh/route");

    const response = await POST(
      new Request("http://localhost/api/studio/settings/notion/models/refresh", {
        method: "POST",
      })
    );

    expect(response.status).toBe(200);
    expect(mockedContainer.getNotionModelSettingsUseCase.execute).toHaveBeenCalledTimes(1);
  });
});
