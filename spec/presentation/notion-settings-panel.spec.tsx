import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotionSettingsPanel } from "@/presentation/features/studio-settings/notion-settings-panel";
import type { NotionModelSettingsDto, NotionSchemaMappingResultDto } from "@/presentation/types/studio-settings";

const getNotionModelSettings = vi.fn();
const selectNotionModelSource = vi.fn();
const refreshNotionModelSettings = vi.fn();
const getNotionSchemaMapping = vi.fn();
const updateNotionSchemaMapping = vi.fn();

vi.mock("@/presentation/lib/studio-settings-api", () => ({
  getNotionModelSettings: (...args: unknown[]) => getNotionModelSettings(...args),
  selectNotionModelSource: (...args: unknown[]) => selectNotionModelSource(...args),
  refreshNotionModelSettings: (...args: unknown[]) => refreshNotionModelSettings(...args),
  getNotionSchemaMapping: (...args: unknown[]) => getNotionSchemaMapping(...args),
  updateNotionSchemaMapping: (...args: unknown[]) => updateNotionSchemaMapping(...args),
}));

function createSettings(overrides?: Partial<NotionModelSettingsDto>): NotionModelSettingsDto {
  return {
    sourcePage: {
      id: "source-page-1",
      configured: true,
    },
    availableTemplates: [
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
    ],
    models: [
      {
        template: "blog",
        displayName: "Blog Model",
        configuredDataSourceId: null,
      },
      {
        template: "resume",
        displayName: "Resume Model",
        configuredDataSourceId: null,
      },
    ],
    candidates: [],
    meta: {
      generatedAt: "2026-01-01T00:00:00.000Z",
      candidateCount: 0,
    },
    ...overrides,
  };
}

function createSchemaMapping(): NotionSchemaMappingResultDto {
  return {
    generatedAt: "2026-01-01T00:00:00.000Z",
    reports: [
      {
        source: "blog",
        dataSourceId: "",
        configured: false,
        ok: false,
        message: "not configured",
        checks: [],
        availableProperties: [],
      },
    ],
  };
}

describe("NotionSettingsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getNotionSchemaMapping.mockResolvedValue({ ok: true, data: createSchemaMapping() });
    getNotionModelSettings.mockResolvedValue({
      ok: true,
      data: createSettings({
        candidates: [
          {
            databaseId: "db-1",
            databaseTitle: "Alpha Database",
            dataSourceId: "ds-1",
            url: "https://notion.so/db-1",
          },
        ],
        meta: {
          generatedAt: "2026-01-01T00:00:00.000Z",
          candidateCount: 1,
        },
      }),
    });
    refreshNotionModelSettings.mockResolvedValue({
      ok: true,
      data: createSettings(),
    });
    selectNotionModelSource.mockResolvedValue({
      ok: true,
      data: createSettings({
        models: [
          {
            template: "blog",
            displayName: "Blog Model",
            configuredDataSourceId: "ds-1",
          },
          {
            template: "resume",
            displayName: "Resume Model",
            configuredDataSourceId: null,
          },
        ],
        candidates: [
          {
            databaseId: "db-1",
            databaseTitle: "Alpha Database",
            dataSourceId: "ds-1",
            url: "https://notion.so/db-1",
          },
        ],
        meta: {
          generatedAt: "2026-01-01T00:00:00.000Z",
          candidateCount: 1,
        },
      }),
    });
  });

  it("auto loads model settings on mount", async () => {
    render(<NotionSettingsPanel initialSettings={createSettings()} />);

    await waitFor(() => {
      expect(getNotionModelSettings).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText("Alpha Database")).toBeInTheDocument();
  });

  it("hides model registration controls in no-registration mode", async () => {
    render(<NotionSettingsPanel initialSettings={createSettings()} />);

    await waitFor(() => {
      expect(getNotionModelSettings).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByText("Model Registration")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /register/i })).not.toBeInTheDocument();
  });

  it("binds model to selected data source id", async () => {
    render(
      <NotionSettingsPanel
        initialSettings={createSettings({
          candidates: [
            {
              databaseId: "db-1",
              databaseTitle: "Alpha Database",
              dataSourceId: "ds-1",
              url: "https://notion.so/db-1",
            },
          ],
          meta: {
            generatedAt: "2026-01-01T00:00:00.000Z",
            candidateCount: 1,
          },
        })}
      />
    );

    const select = await screen.findByLabelText("bind-source-blog");
    fireEvent.change(select, { target: { value: "ds-1" } });

    await waitFor(() => {
      expect(selectNotionModelSource).toHaveBeenCalledWith({
        template: "blog",
        dataSourceId: "ds-1",
      });
    });
  });
});
