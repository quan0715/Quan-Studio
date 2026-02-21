import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotionSettingsPanel } from "@/presentation/features/studio-settings/notion-settings-panel";
import type {
  NotionModelDefinitionListDto,
  NotionModelSettingsDto,
} from "@/presentation/types/studio-settings";

const getNotionModelSettings = vi.fn();
const refreshNotionModelSettings = vi.fn();
const getNotionSchemaMapping = vi.fn();
const provisionNotionDatabase = vi.fn();
const migrateNotionSchema = vi.fn();
const listNotionModelDefinitions = vi.fn();
const createNotionModelDefinition = vi.fn();
const selectNotionModelSource = vi.fn();
const addNotionModelField = vi.fn();
const updateNotionModelField = vi.fn();
const deleteNotionModelField = vi.fn();

vi.mock("@/presentation/lib/studio-settings-api", () => ({
  getNotionModelSettings: (...args: unknown[]) => getNotionModelSettings(...args),
  refreshNotionModelSettings: (...args: unknown[]) => refreshNotionModelSettings(...args),
  getNotionSchemaMapping: (...args: unknown[]) => getNotionSchemaMapping(...args),
  provisionNotionDatabase: (...args: unknown[]) => provisionNotionDatabase(...args),
  migrateNotionSchema: (...args: unknown[]) => migrateNotionSchema(...args),
  listNotionModelDefinitions: (...args: unknown[]) => listNotionModelDefinitions(...args),
  createNotionModelDefinition: (...args: unknown[]) => createNotionModelDefinition(...args),
  selectNotionModelSource: (...args: unknown[]) => selectNotionModelSource(...args),
  addNotionModelField: (...args: unknown[]) => addNotionModelField(...args),
  updateNotionModelField: (...args: unknown[]) => updateNotionModelField(...args),
  deleteNotionModelField: (...args: unknown[]) => deleteNotionModelField(...args),
}));

function createSettings(overrides?: Partial<NotionModelSettingsDto>): NotionModelSettingsDto {
  return {
    sourcePage: {
      id: "source-page-1",
      configured: true,
    },
    availableTemplates: [
      { id: "blog", label: "Blog", defaultDisplayName: "Blog Model", schemaSource: "blog" },
    ],
    models: [{ template: "blog", displayName: "Blog Model", configuredDataSourceId: null }],
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
    ...overrides,
  };
}

function createDefinitions(): NotionModelDefinitionListDto {
  return {
    generatedAt: "2026-01-01T00:00:00.000Z",
    models: [
      {
        modelKey: "blog",
        label: "Blog",
        defaultDisplayName: "Blog Model",
        schemaSource: "blog",
        projectionKind: "flat_list",
        projectionConfigJson: {},
        isActive: true,
        dataSourceId: null,
        fields: [
          {
            fieldKey: "title",
            appField: "blog.title",
            expectedType: "title",
            required: true,
            description: "Title",
            defaultNotionField: "Title",
            builtinField: null,
            sortOrder: 0,
          },
        ],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  };
}

function createEmptyDefinitions(): NotionModelDefinitionListDto {
  return {
    generatedAt: "2026-01-01T00:00:00.000Z",
    models: [],
  };
}

describe("NotionSettingsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getNotionModelSettings.mockResolvedValue({ ok: true, data: createSettings() });
    refreshNotionModelSettings.mockResolvedValue({ ok: true, data: createSettings() });
    getNotionSchemaMapping.mockResolvedValue({
      ok: true,
      data: {
        generatedAt: "2026-01-01T00:00:00.000Z",
        reports: [
          {
            source: "blog",
            dataSourceId: "",
            configured: false,
            ok: false,
            message: "not configured",
            checks: [
              {
                appField: "blog.title",
                description: "title",
                required: true,
                expectedNotionField: "Title",
                expectedType: "title",
                selectedNotionField: null,
                matchedName: null,
                actualType: null,
                mappedExplicitly: false,
                status: "missing_required",
                message: "missing",
              },
            ],
            availableProperties: [
              { name: "Title", type: "title" },
              { name: "Location", type: "rich_text" },
            ],
          },
        ],
      },
    });
    provisionNotionDatabase.mockResolvedValue({
      ok: true,
      data: { databaseId: "db-2", dataSourceId: "ds-2", displayName: "Blog Model" },
    });
    migrateNotionSchema.mockResolvedValue({
      ok: true,
      data: { dataSourceId: "ds-1", actions: [], applied: [], skipped: [] },
    });
    listNotionModelDefinitions.mockResolvedValue({ ok: true, data: createDefinitions() });
    createNotionModelDefinition.mockResolvedValue({
      ok: true,
      data: createDefinitions().models[0],
    });
    selectNotionModelSource.mockResolvedValue({ ok: true, data: createSettings() });
    addNotionModelField.mockResolvedValue({ ok: true, data: createDefinitions() });
    updateNotionModelField.mockResolvedValue({ ok: true, data: createDefinitions() });
    deleteNotionModelField.mockResolvedValue({ ok: true, data: createDefinitions() });
  });

  it("renders source page block on top and model tabs", async () => {
    render(<NotionSettingsPanel initialSettings={createSettings()} />);

    await waitFor(() => {
      expect(getNotionModelSettings).toHaveBeenCalledTimes(1);
      expect(listNotionModelDefinitions).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText("Source Page Data Sources")).toBeInTheDocument();
    expect(screen.getByText("Alpha Database")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "blog" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Model" })).toBeInTheDocument();
    expect(screen.queryByText("Schema Mapping (App <-> Notion)")).not.toBeInTheDocument();
    expect(screen.getByText("Schema")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Model View" })).toBeInTheDocument();
  });

  it("binds selected model to data source in model section", async () => {
    render(<NotionSettingsPanel initialSettings={createSettings()} />);

    const select = await screen.findByLabelText("model-binding-blog");
    fireEvent.change(select, { target: { value: "ds-1" } });

    await waitFor(() => {
      expect(selectNotionModelSource).toHaveBeenCalledWith({ template: "blog", dataSourceId: "ds-1" });
    });
  });

  it("creates model from create-model dialog", async () => {
    listNotionModelDefinitions
      .mockResolvedValueOnce({ ok: true, data: createEmptyDefinitions() })
      .mockResolvedValue({ ok: true, data: createDefinitions() });

    render(<NotionSettingsPanel initialSettings={createSettings()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Create Model" }));
    fireEvent.change(await screen.findByPlaceholderText("modelKey"), { target: { value: "resume" } });
    fireEvent.change(screen.getByPlaceholderText("label"), { target: { value: "Resume" } });
    fireEvent.change(screen.getByPlaceholderText("display name"), { target: { value: "Resume Model" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(createNotionModelDefinition).toHaveBeenCalledWith({
        modelKey: "resume",
        label: "Resume",
        defaultDisplayName: "Resume Model",
        projectionKind: "flat_list",
      });
    });
  });

  it("saves inline field and auto builds appField prefix", async () => {
    render(<NotionSettingsPanel initialSettings={createSettings()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));

    const fieldKeyInput = await screen.findByLabelText("field-key-title");
    fireEvent.change(fieldKeyInput, { target: { value: "headline" } });

    const typeSelect = screen.getByLabelText("field-type-title");
    fireEvent.change(typeSelect, { target: { value: "builtin:page.icon" } });

    fireEvent.click(screen.getByLabelText("save-field-title"));

    await waitFor(() => {
      expect(updateNotionModelField).toHaveBeenCalledWith(
        "blog",
        "title",
        expect.objectContaining({
          fieldKey: "headline",
          appField: "blog.headline",
          expectedType: "builtin",
          builtinField: "page.icon",
          defaultNotionField: null,
        })
      );
    });
  });

  it("adds empty field row at table bottom in edit mode", async () => {
    render(<NotionSettingsPanel initialSettings={createSettings()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Field" }));

    expect(screen.getByLabelText("new-field-key-0")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("new-field-key-0"), { target: { value: "location" } });
    fireEvent.change(screen.getByLabelText("new-field-type-0"), { target: { value: "rich_text" } });
    fireEvent.click(screen.getByLabelText("save-new-field-0"));

    await waitFor(() => {
      expect(addNotionModelField).toHaveBeenCalledWith(
        "blog",
        expect.objectContaining({
          fieldKey: "location",
          appField: "blog.location",
          expectedType: "rich_text",
        })
      );
    });
  });

  it("shows provision button when model is not bound", async () => {
    render(<NotionSettingsPanel initialSettings={createSettings()} />);
    const provisionButton = await screen.findByRole("button", { name: "Provision Database" });
    fireEvent.click(provisionButton);

    await waitFor(() => {
      expect(provisionNotionDatabase).toHaveBeenCalledWith({ modelId: "blog" });
    });
  });

  it("patches single field to notion from model view action", async () => {
    getNotionSchemaMapping.mockResolvedValueOnce({
      ok: true,
      data: {
        generatedAt: "2026-01-01T00:00:00.000Z",
        reports: [
          {
            source: "blog",
            dataSourceId: "ds-1",
            configured: true,
            ok: false,
            message: "missing field",
            checks: [
              {
                appField: "blog.title",
                description: "title",
                required: true,
                expectedNotionField: "Title",
                expectedType: "title",
                selectedNotionField: null,
                matchedName: null,
                actualType: null,
                mappedExplicitly: false,
                status: "missing_required",
                message: "missing",
              },
            ],
            availableProperties: [],
          },
        ],
      },
    });
    render(
      <NotionSettingsPanel
        initialSettings={createSettings({
          models: [{ template: "blog", displayName: "Blog Model", configuredDataSourceId: "ds-1" }],
        })}
      />
    );

    fireEvent.click(await screen.findByRole("button", { name: "Resolve" }));
    fireEvent.click(await screen.findByRole("button", { name: "Patch Notion DB" }));

    await waitFor(() => {
      expect(migrateNotionSchema).toHaveBeenCalledWith({
        modelId: "blog",
        fieldName: "Title",
      });
    });
  });

  it("patches notion-only property to model", async () => {
    render(<NotionSettingsPanel initialSettings={createSettings()} />);

    fireEvent.click(await screen.findByRole("button", { name: "Resolve" }));
    fireEvent.click(await screen.findByRole("button", { name: "Patch Model" }));

    await waitFor(() => {
      expect(addNotionModelField).toHaveBeenCalledWith(
        "blog",
        expect.objectContaining({
          fieldKey: "location",
          appField: "blog.location",
          expectedType: "rich_text",
          defaultNotionField: "Location",
        })
      );
    });
  });
});
