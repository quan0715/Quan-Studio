"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/presentation/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/presentation/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/presentation/components/ui/tabs";
import {
  addNotionModelField,
  createNotionModelDefinition,
  deleteNotionModelField,
  getNotionModelSettings,
  getNotionSchemaMapping,
  listNotionModelDefinitions,
  migrateNotionSchema,
  provisionNotionDatabase,
  refreshNotionModelSettings,
  selectNotionModelSource,
  updateNotionSchemaMapping,
  updateNotionModelField,
} from "@/presentation/lib/studio-settings-api";
import type {
  MigrateResultDto,
  NotionModelDefinitionDto,
  NotionModelFieldDto,
  NotionModelSettingsDto,
  NotionSchemaMappingReportDto,
  NotionSchemaMappingResultDto,
  NotionModelTemplate,
} from "@/presentation/types/studio-settings";

type NotionSettingsPanelProps = {
  initialSettings: NotionModelSettingsDto;
};

type Notice =
  | {
      variant: "default" | "destructive";
      message: string;
    }
  | null;

type EditableFieldDraft = {
  fieldKey: string;
  notionField: string;
  typeSelection: string;
  required: boolean;
  description: string;
};

type FieldMode = "preview" | "edit";
type ResolveDialogState =
  | { open: false }
  | {
      open: true;
      mode: "model_field";
      model: NotionModelDefinitionDto;
      schemaReport: NotionSchemaMappingReportDto;
      check: NotionSchemaMappingReportDto["checks"][number];
      modelField: NotionModelFieldDto;
      notionFieldNameDraft: string;
      connectPropertyName: string;
    }
  | {
      open: true;
      mode: "notion_only";
      model: NotionModelDefinitionDto;
      schemaReport: NotionSchemaMappingReportDto;
      property: { name: string; type: string };
      connectAppField: string;
    };

const FIELD_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "title", label: "T title" },
  { value: "rich_text", label: "R rich_text" },
  { value: "select", label: "S select" },
  { value: "multi_select", label: "M multi_select" },
  { value: "status", label: "S status" },
  { value: "number", label: "# number" },
  { value: "date", label: "D date" },
  { value: "checkbox", label: "C checkbox" },
  { value: "url", label: "U url" },
  { value: "file", label: "F file" },
  { value: "media", label: "M media" },
  { value: "builtin:page.icon", label: "I icon" },
  { value: "builtin:page.cover", label: "C cover" },
  { value: "builtin:page.created_time", label: "C created_time" },
  { value: "builtin:page.last_edited_time", label: "L last_edited_time" },
];

export function NotionSettingsPanel({ initialSettings }: NotionSettingsPanelProps) {
  const [settings, setSettings] = useState<NotionModelSettingsDto>(initialSettings);
  const [notice, setNotice] = useState<Notice>(null);
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);
  const [bindingTemplate, setBindingTemplate] = useState<string | null>(null);
  const [modelDefinitions, setModelDefinitions] = useState<NotionModelDefinitionDto[]>([]);
  const [schemaMapping, setSchemaMapping] = useState<NotionSchemaMappingResultDto | null>(null);
  const [activeModelTab, setActiveModelTab] = useState<string>("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [creatingModel, setCreatingModel] = useState(false);
  const [addingFieldModel, setAddingFieldModel] = useState<string | null>(null);
  const [savingFieldKey, setSavingFieldKey] = useState<string | null>(null);
  const [provisioningModel, setProvisioningModel] = useState<string | null>(null);
  const [patchingNotionKey, setPatchingNotionKey] = useState<string | null>(null);
  const [patchingModelKey, setPatchingModelKey] = useState<string | null>(null);
  const [migrateResult, setMigrateResult] = useState<MigrateResultDto | null>(null);
  const [newModelKey, setNewModelKey] = useState("");
  const [newModelLabel, setNewModelLabel] = useState("");
  const [newModelDisplayName, setNewModelDisplayName] = useState("");
  const [fieldDrafts, setFieldDrafts] = useState<Record<string, EditableFieldDraft>>({});
  const [newFieldDrafts, setNewFieldDrafts] = useState<Record<string, EditableFieldDraft[]>>({});
  const [fieldModes, setFieldModes] = useState<Record<string, FieldMode>>({});
  const [resolveDialog, setResolveDialog] = useState<ResolveDialogState>({ open: false });

  useEffect(() => {
    let active = true;
    void (async () => {
      setIsRefreshingModels(true);
      const [settingsResponse, definitionsResponse] = await Promise.all([
        getNotionModelSettings(),
        listNotionModelDefinitions(),
      ]);
      if (!active) {
        return;
      }
      setIsRefreshingModels(false);

      if (settingsResponse.ok) {
        setSettings(settingsResponse.data);
      }

      if (definitionsResponse.ok) {
        setModelDefinitions(definitionsResponse.data.models);
        setActiveModelTab((prev) => prev || definitionsResponse.data.models[0]?.modelKey || "");
      }

      const schemaResponse = await getNotionSchemaMapping();
      if (schemaResponse.ok) {
        setSchemaMapping(schemaResponse.data);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  async function loadModelSettings() {
    const response = await getNotionModelSettings();
    if (response.ok) {
      setSettings(response.data);
    }
  }

  async function loadSchemaMapping() {
    const response = await getNotionSchemaMapping();
    if (response.ok) {
      setSchemaMapping(response.data);
    }
  }

  async function loadModelDefinitions() {
    const response = await listNotionModelDefinitions();
    if (response.ok) {
      setModelDefinitions(response.data.models);
      setActiveModelTab((prev) => prev || response.data.models[0]?.modelKey || "");
    }
  }

  async function onRefreshCandidates() {
    setIsRefreshingModels(true);
    setNotice(null);
    const response = await refreshNotionModelSettings();
    setIsRefreshingModels(false);

    if (!response.ok) {
      setNotice({ variant: "destructive", message: response.error.message });
      return;
    }

    setSettings(response.data);
    setNotice({ variant: "default", message: "Source page data sources refreshed." });
  }

  async function onCreateModelDefinition() {
    setCreatingModel(true);
    setNotice(null);
    const response = await createNotionModelDefinition({
      modelKey: newModelKey,
      label: newModelLabel,
      defaultDisplayName: newModelDisplayName,
      projectionKind: "flat_list",
    });
    setCreatingModel(false);

    if (!response.ok) {
      setNotice({ variant: "destructive", message: response.error.message });
      return;
    }

    setNewModelKey("");
    setNewModelLabel("");
    setNewModelDisplayName("");
    await Promise.all([loadModelDefinitions(), loadModelSettings()]);
    setActiveModelTab(response.data.modelKey);
    setIsCreateDialogOpen(false);
    setNotice({ variant: "default", message: "Model created." });
  }

  async function onBindSource(template: NotionModelTemplate, dataSourceId: string) {
    if (!dataSourceId.trim()) {
      return;
    }

    setBindingTemplate(template);
    setNotice(null);
    const response = await selectNotionModelSource({ template, dataSourceId });
    setBindingTemplate(null);

    if (!response.ok) {
      setNotice({ variant: "destructive", message: response.error.message });
      return;
    }

    setSettings(response.data);
    await loadSchemaMapping();
    setNotice({ variant: "default", message: `${template} source mapped.` });
  }

  function appendEmptyFieldDraft(modelKey: string) {
    setNewFieldDrafts((prev) => ({
      ...prev,
      [modelKey]: [...(prev[modelKey] ?? []), createEmptyFieldDraft()],
    }));
  }

  function onEditNewFieldDraft(modelKey: string, index: number, patch: Partial<EditableFieldDraft>) {
    setNewFieldDrafts((prev) => {
      const drafts = [...(prev[modelKey] ?? [])];
      drafts[index] = { ...(drafts[index] ?? createEmptyFieldDraft()), ...patch };
      return { ...prev, [modelKey]: drafts };
    });
  }

  function removeNewFieldDraft(modelKey: string, index: number) {
    setNewFieldDrafts((prev) => {
      const drafts = [...(prev[modelKey] ?? [])];
      drafts.splice(index, 1);
      return { ...prev, [modelKey]: drafts };
    });
  }

  async function onSaveNewField(modelKey: string, index: number) {
    const draft = newFieldDrafts[modelKey]?.[index];
    if (!draft) {
      return;
    }

    setAddingFieldModel(modelKey);
    setNotice(null);

    const resolvedType = resolveTypeSelection(draft.typeSelection);
    const response = await addNotionModelField(modelKey, {
      fieldKey: draft.fieldKey.trim(),
      appField: `${modelKey}.${draft.fieldKey.trim()}`,
      expectedType: resolvedType.expectedType,
      required: draft.required,
      description: draft.description.trim(),
      defaultNotionField:
        resolvedType.expectedType === "builtin"
          ? null
          : normalizeOptionalValue(draft.notionField || draft.fieldKey),
      builtinField: resolvedType.builtinField,
    });

    setAddingFieldModel(null);

    if (!response.ok) {
      setNotice({ variant: "destructive", message: response.error.message });
      return;
    }

    removeNewFieldDraft(modelKey, index);
    setModelDefinitions(response.data.models);
    await loadSchemaMapping();
    setNotice({ variant: "default", message: "Field added." });
  }

  async function onDeleteField(modelKey: string, fieldKey: string) {
    setNotice(null);
    const response = await deleteNotionModelField(modelKey, fieldKey);
    if (!response.ok) {
      setNotice({ variant: "destructive", message: response.error.message });
      return;
    }
    setModelDefinitions(response.data.models);
    await loadSchemaMapping();
    setNotice({ variant: "default", message: "Field removed." });
  }

  function onEditFieldDraft(
    rowKey: string,
    patch: Partial<EditableFieldDraft>,
    baseDraft?: EditableFieldDraft
  ) {
    setFieldDrafts((prev) => ({
      ...prev,
      [rowKey]: {
        ...(prev[rowKey] ??
          baseDraft ?? {
            fieldKey: "",
            notionField: "",
            typeSelection: "rich_text",
            required: false,
            description: "",
          }),
        ...patch,
      },
    }));
  }

  async function onSaveField(modelKey: string, originalFieldKey: string) {
    const rowKey = `${modelKey}:${originalFieldKey}`;
    const draft = fieldDrafts[rowKey];
    const currentField = modelDefinitions
      .find((model) => model.modelKey === modelKey)
      ?.fields.find((field) => field.fieldKey === originalFieldKey);
    if (!draft) {
      return;
    }

    setSavingFieldKey(rowKey);
    setNotice(null);

    const resolvedType = resolveTypeSelection(draft.typeSelection);
    const response = await updateNotionModelField(modelKey, originalFieldKey, {
      fieldKey: draft.fieldKey.trim(),
      appField: `${modelKey}.${draft.fieldKey.trim()}`,
      expectedType: resolvedType.expectedType,
      required: draft.required,
      description: draft.description.trim(),
      defaultNotionField:
        resolvedType.expectedType === "builtin"
          ? null
          : normalizeOptionalValue(
              draft.notionField || (currentField?.defaultNotionField ?? draft.fieldKey)
            ),
      builtinField: resolvedType.builtinField,
    });

    setSavingFieldKey(null);

    if (!response.ok) {
      setNotice({ variant: "destructive", message: response.error.message });
      return;
    }

    setModelDefinitions(response.data.models);
    await loadModelSettings();
    await loadSchemaMapping();
    setNotice({ variant: "default", message: "Field updated." });
  }

  async function onProvisionDatabase(modelId: string) {
    setProvisioningModel(modelId);
    setNotice(null);
    setMigrateResult(null);
    const response = await provisionNotionDatabase({ modelId });
    setProvisioningModel(null);

    if (!response.ok) {
      setNotice({ variant: "destructive", message: response.error.message });
      return;
    }

    await Promise.all([loadModelSettings(), loadSchemaMapping()]);
    setNotice({
      variant: "default",
      message: `Database provisioned: ${response.data.displayName} (${response.data.dataSourceId})`,
    });
  }

  async function onPatchFieldToNotion(modelId: string, fieldName: string) {
    const key = `${modelId}:${fieldName}`;
    setPatchingNotionKey(key);
    setNotice(null);
    setMigrateResult(null);
    const response = await migrateNotionSchema({ modelId, fieldName });
    setPatchingNotionKey(null);

    if (!response.ok) {
      setNotice({ variant: "destructive", message: response.error.message });
      return;
    }

    setMigrateResult(response.data);
    await loadSchemaMapping();
    setResolveDialog({ open: false });
    setNotice({ variant: "default", message: `Patched Notion field: ${fieldName}` });
  }

  async function onPatchPropertyToModel(
    model: NotionModelDefinitionDto,
    property: { name: string; type: string }
  ) {
    const key = `${model.modelKey}:${property.name}`;
    setPatchingModelKey(key);
    setNotice(null);

    const fieldKey = generateFieldKeyFromProperty(property.name, model.fields);
    const resolvedType = mapNotionPropertyTypeToExpectedType(property.type);
    const response = await addNotionModelField(model.modelKey, {
      fieldKey,
      appField: `${model.modelKey}.${fieldKey}`,
      expectedType: resolvedType,
      required: false,
      description: "",
      defaultNotionField: resolvedType === "builtin" ? null : property.name,
      builtinField: null,
    });
    setPatchingModelKey(null);

    if (!response.ok) {
      setNotice({ variant: "destructive", message: response.error.message });
      return;
    }

    setModelDefinitions(response.data.models);
    await loadSchemaMapping();
    setResolveDialog({ open: false });
    setNotice({ variant: "default", message: `Patched model from Notion: ${property.name}` });
  }

  async function onResolveEditNotionFieldName() {
    if (!resolveDialog.open || resolveDialog.mode !== "model_field") return;
    const { model, modelField, notionFieldNameDraft } = resolveDialog;
    const resolvedType = resolveTypeSelection(
      modelField.expectedType === "builtin" && modelField.builtinField
        ? `builtin:${modelField.builtinField}`
        : modelField.expectedType
    );

    const response = await updateNotionModelField(model.modelKey, modelField.fieldKey, {
      fieldKey: modelField.fieldKey,
      appField: modelField.appField,
      expectedType: resolvedType.expectedType,
      required: modelField.required,
      description: modelField.description,
      defaultNotionField:
        resolvedType.expectedType === "builtin"
          ? null
          : normalizeOptionalValue(notionFieldNameDraft || modelField.defaultNotionField || modelField.fieldKey),
      builtinField: resolvedType.builtinField,
    });

    if (!response.ok) {
      setNotice({ variant: "destructive", message: response.error.message });
      return;
    }

    setModelDefinitions(response.data.models);
    setResolveDialog({ open: false });
    await loadSchemaMapping();
    setNotice({ variant: "default", message: "Notion Field updated." });
  }

  async function onResolveConnectExisting() {
    if (!resolveDialog.open) return;

    if (resolveDialog.mode === "model_field") {
      if (!resolveDialog.connectPropertyName) return;
      const response = await updateNotionSchemaMapping({
        source: resolveDialog.model.schemaSource,
        mappings: {
          [resolveDialog.check.appField]: resolveDialog.connectPropertyName,
        },
      });
      if (!response.ok) {
        setNotice({ variant: "destructive", message: response.error.message });
        return;
      }
      setSchemaMapping(response.data);
      setResolveDialog({ open: false });
      setNotice({ variant: "default", message: "Connected existing Notion field." });
      return;
    }

    if (!resolveDialog.connectAppField) return;
    const response = await updateNotionSchemaMapping({
      source: resolveDialog.model.schemaSource,
      mappings: {
        [resolveDialog.connectAppField]: resolveDialog.property.name,
      },
    });
    if (!response.ok) {
      setNotice({ variant: "destructive", message: response.error.message });
      return;
    }
    setSchemaMapping(response.data);
    setResolveDialog({ open: false });
    setNotice({ variant: "default", message: "Connected Notion field to app field." });
  }

  function getFieldMode(modelKey: string): FieldMode {
    return fieldModes[modelKey] ?? "preview";
  }

  function setFieldMode(modelKey: string, mode: FieldMode) {
    setFieldModes((prev) => ({ ...prev, [modelKey]: mode }));
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle>Source Page Data Sources</CardTitle>
          <p className="text-xs text-muted-foreground">
            Source page id: <span className="font-mono">{settings.sourcePage.configured ? settings.sourcePage.id : "Not configured"}</span>
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={isRefreshingModels} onClick={() => void onRefreshCandidates()}>
              {isRefreshingModels ? "Refreshing..." : "Refresh Source Page"}
            </Button>
          </div>

          {settings.candidates.length === 0 ? (
            <p className="text-xs text-muted-foreground">No data sources found under current source page.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Data Source ID</TableHead>
                  <TableHead>URL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settings.candidates.map((candidate) => (
                  <TableRow key={candidate.dataSourceId}>
                    <TableCell>
                      <p className="font-medium">{candidate.databaseTitle}</p>
                    </TableCell>
                    <TableCell className="font-mono text-[11px]">{candidate.dataSourceId}</TableCell>
                    <TableCell className="text-xs">
                      {candidate.url ? (
                        <a href={candidate.url} target="_blank" rel="noreferrer noopener" className="text-primary underline underline-offset-4">
                          Open
                        </a>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-2">
          <CardTitle>Model Settings</CardTitle>
          <p className="text-xs text-muted-foreground">Switch model by tabs, bind source first, then edit fields inline.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium">Models</p>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">Create Model</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Model</DialogTitle>
                  <DialogDescription>Create a new Notion model definition.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-2">
                  <input className="border px-2 py-1 text-xs" placeholder="modelKey" value={newModelKey} onChange={(e) => setNewModelKey(e.target.value)} />
                  <input className="border px-2 py-1 text-xs" placeholder="label" value={newModelLabel} onChange={(e) => setNewModelLabel(e.target.value)} />
                  <input className="border px-2 py-1 text-xs" placeholder="display name" value={newModelDisplayName} onChange={(e) => setNewModelDisplayName(e.target.value)} />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                    <Button variant="outline" disabled={creatingModel} onClick={() => void onCreateModelDefinition()}>
                      {creatingModel ? "Creating..." : "Create"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Tabs value={activeModelTab} onValueChange={setActiveModelTab} className="space-y-3">
            <TabsList>
              {modelDefinitions.map((model) => (
                <TabsTrigger key={model.modelKey} value={model.modelKey}>
                  {model.modelKey}
                </TabsTrigger>
              ))}
            </TabsList>

            {modelDefinitions.map((model) => {
              const binding = settings.models.find((item) => item.template === model.modelKey) ?? null;
              const schemaReport = resolveSchemaReport(schemaMapping, model.schemaSource);
              const isEditMode = getFieldMode(model.modelKey) === "edit";
              return (
                <TabsContent key={model.modelKey} value={model.modelKey} className="space-y-3">
                  <div className="space-y-2">
                    <p className="text-xs font-medium">Source Binding</p>
                    {binding ? (
                      <div className="space-y-2">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <select
                            aria-label={`model-binding-${binding.template}`}
                            className="border-input dark:bg-input/30 h-8 min-w-[320px] rounded-none border bg-transparent px-2.5 text-xs outline-none disabled:cursor-not-allowed disabled:opacity-50"
                            value={binding.configuredDataSourceId ?? ""}
                            disabled={bindingTemplate === binding.template || settings.candidates.length === 0}
                            onChange={(event) => {
                              void onBindSource(binding.template, event.target.value);
                            }}
                          >
                            <option value="">Select data source id</option>
                            {settings.candidates.map((candidate) => (
                              <option key={`${binding.template}-${candidate.dataSourceId}`} value={candidate.dataSourceId}>
                                {candidate.databaseTitle} ({candidate.dataSourceId})
                              </option>
                            ))}
                          </select>
                          <Badge
                            variant="outline"
                            className={
                              binding.configuredDataSourceId
                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                            }
                          >
                            {binding.configuredDataSourceId ? "Mapped" : "Unmapped"}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {!binding.configuredDataSourceId ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={provisioningModel === model.modelKey}
                              onClick={() => void onProvisionDatabase(model.modelKey)}
                            >
                              {provisioningModel === model.modelKey ? "Provisioning..." : "Provision Database"}
                            </Button>
                          ) : null}
                          {migrateResult && binding.configuredDataSourceId === migrateResult.dataSourceId ? (
                            <Badge variant="outline">
                              applied: {migrateResult.applied.length}, skipped: {migrateResult.skipped.length}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No binding entry yet for this model.</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium">Fields</p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={!isEditMode ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFieldMode(model.modelKey, "preview")}
                        >
                          Model View
                        </Button>
                        <Button
                          variant={isEditMode ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFieldMode(model.modelKey, "edit")}
                        >
                          Edit
                        </Button>
                        {isEditMode ? (
                          <Button variant="outline" size="sm" onClick={() => appendEmptyFieldDraft(model.modelKey)}>
                            Add Field
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    {!isEditMode ? (
                      <div className="rounded-none border p-2 text-xs">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="font-medium">Schema</span>
                          <Badge
                            variant="outline"
                            className={
                              schemaReport?.ok
                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                : "border-destructive/40 bg-destructive/10 text-destructive"
                            }
                          >
                            {schemaReport?.ok ? "PASS" : "ISSUES"}
                          </Badge>
                        </div>
                        <p className="mb-2 text-muted-foreground">{schemaReport?.message ?? "No schema report."}</p>
                        {schemaReport ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>App Field</TableHead>
                                <TableHead>Notion Field</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Required</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead />
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {model.fields.map((field) => {
                                const check = schemaReport.checks.find((item) => item.appField === field.appField);
                                const expectedNotionField = check?.expectedNotionField ?? field.defaultNotionField ?? "";
                                const actionKey = `${model.modelKey}:${expectedNotionField}`;
                                const canPatchNotion = Boolean(
                                  schemaReport.configured &&
                                    check &&
                                    check.expectedType !== "builtin" &&
                                    check.status !== "ok"
                                );
                                return (
                                  <TableRow key={`${model.modelKey}-${field.fieldKey}`}>
                                    <TableCell>
                                      <p className="font-mono text-[11px]">{field.appField}</p>
                                      <p className="text-xs text-muted-foreground">{field.description || "-"}</p>
                                    </TableCell>
                                    <TableCell className="text-xs">{expectedNotionField || "-"}</TableCell>
                                    <TableCell className="text-xs">
                                      <FieldTypeBadge type={displayFieldType(field)} />
                                    </TableCell>
                                    <TableCell><RequiredPill required={field.required} /></TableCell>
                                    <TableCell><FieldStatusPill status={check?.status ?? "missing_optional"} /></TableCell>
                                    <TableCell>
                                      {canPatchNotion ? (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          disabled={patchingNotionKey === actionKey}
                                          onClick={() =>
                                            setResolveDialog({
                                              open: true,
                                              mode: "model_field",
                                              model,
                                              schemaReport,
                                              check: check!,
                                              modelField: field,
                                              notionFieldNameDraft: expectedNotionField || field.defaultNotionField || "",
                                              connectPropertyName: "",
                                            })
                                          }
                                        >
                                          Resolve
                                        </Button>
                                      ) : null}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                              {getNotionOnlyProperties(schemaReport).map((property) => {
                                const key = `${model.modelKey}:${property.name}`;
                                return (
                                  <TableRow key={key}>
                                    <TableCell className="text-xs">{property.name}</TableCell>
                                    <TableCell className="text-xs">{property.name}</TableCell>
                                    <TableCell className="text-xs">{property.type}</TableCell>
                                    <TableCell><RequiredPill required={false} /></TableCell>
                                    <TableCell><FieldStatusPill status="missing_optional" label="not_in_model" /></TableCell>
                                    <TableCell>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={patchingModelKey === key}
                                        onClick={() =>
                                          setResolveDialog({
                                            open: true,
                                            mode: "notion_only",
                                            model,
                                            schemaReport,
                                            property,
                                            connectAppField: "",
                                          })
                                        }
                                      >
                                        Resolve
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        ) : null}
                      </div>
                    ) : null}
                    {isEditMode ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>fieldKey</TableHead>
                            <TableHead>type</TableHead>
                            <TableHead>required</TableHead>
                            <TableHead>Notion Field</TableHead>
                            <TableHead>description</TableHead>
                            <TableHead />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {model.fields.map((field) => {
                            const rowKey = `${model.modelKey}:${field.fieldKey}`;
                            const draft = fieldDrafts[rowKey] ?? createFieldDraft(field);
                            return (
                              <TableRow key={rowKey}>
                                <TableCell>
                                  <input
                                    aria-label={`field-key-${field.fieldKey}`}
                                    className="w-full border px-2 py-1 text-xs"
                                    value={draft.fieldKey}
                                    onChange={(event) => onEditFieldDraft(rowKey, { fieldKey: event.target.value }, draft)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <select
                                    aria-label={`field-type-${field.fieldKey}`}
                                    className="border px-2 py-1 text-xs"
                                    value={draft.typeSelection}
                                    onChange={(event) => onEditFieldDraft(rowKey, { typeSelection: event.target.value }, draft)}
                                  >
                                    {FIELD_TYPE_OPTIONS.map((type) => (
                                      <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                  </select>
                                </TableCell>
                                <TableCell>
                                  <input
                                    type="checkbox"
                                    checked={draft.required}
                                    onChange={(event) => onEditFieldDraft(rowKey, { required: event.target.checked }, draft)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <input
                                    aria-label={`field-notion-${field.fieldKey}`}
                                    list={`notion-field-options-${model.modelKey}`}
                                    className="w-full border px-2 py-1 text-xs"
                                    value={draft.notionField}
                                    disabled={isBuiltinTypeSelection(draft.typeSelection)}
                                    onChange={(event) => onEditFieldDraft(rowKey, { notionField: event.target.value }, draft)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <input
                                    className="w-full border px-2 py-1 text-xs"
                                    value={draft.description}
                                    onChange={(event) => onEditFieldDraft(rowKey, { description: event.target.value }, draft)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={savingFieldKey === rowKey}
                                      aria-label={`save-field-${field.fieldKey}`}
                                      onClick={() => void onSaveField(model.modelKey, field.fieldKey)}
                                    >
                                      <CheckIcon />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      aria-label={`delete-field-${field.fieldKey}`}
                                      onClick={() => void onDeleteField(model.modelKey, field.fieldKey)}
                                    >
                                      <TrashIcon />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          {(newFieldDrafts[model.modelKey] ?? []).map((draft, index) => {
                            const rowKey = `${model.modelKey}:__new__:${index}`;
                            return (
                              <TableRow key={rowKey}>
                                <TableCell>
                                  <input
                                    aria-label={`new-field-key-${index}`}
                                    className="w-full border px-2 py-1 text-xs"
                                    value={draft.fieldKey}
                                    onChange={(event) =>
                                      onEditNewFieldDraft(model.modelKey, index, { fieldKey: event.target.value })
                                    }
                                  />
                                </TableCell>
                                <TableCell>
                                  <select
                                    aria-label={`new-field-type-${index}`}
                                    className="border px-2 py-1 text-xs"
                                    value={draft.typeSelection}
                                    onChange={(event) =>
                                      onEditNewFieldDraft(model.modelKey, index, { typeSelection: event.target.value })
                                    }
                                  >
                                    {FIELD_TYPE_OPTIONS.map((type) => (
                                      <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                  </select>
                                </TableCell>
                                <TableCell>
                                  <input
                                    type="checkbox"
                                    checked={draft.required}
                                    onChange={(event) =>
                                      onEditNewFieldDraft(model.modelKey, index, { required: event.target.checked })
                                    }
                                  />
                                </TableCell>
                                <TableCell>
                                  <input
                                    aria-label={`new-field-notion-${index}`}
                                    list={`notion-field-options-${model.modelKey}`}
                                    className="w-full border px-2 py-1 text-xs"
                                    value={draft.notionField}
                                    disabled={isBuiltinTypeSelection(draft.typeSelection)}
                                    onChange={(event) =>
                                      onEditNewFieldDraft(model.modelKey, index, { notionField: event.target.value })
                                    }
                                  />
                                </TableCell>
                                <TableCell>
                                  <input
                                    className="w-full border px-2 py-1 text-xs"
                                    value={draft.description}
                                    onChange={(event) =>
                                      onEditNewFieldDraft(model.modelKey, index, { description: event.target.value })
                                    }
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={addingFieldModel === model.modelKey}
                                      aria-label={`save-new-field-${index}`}
                                      onClick={() => void onSaveNewField(model.modelKey, index)}
                                    >
                                      <CheckIcon />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      aria-label={`discard-new-field-${index}`}
                                      onClick={() => removeNewFieldDraft(model.modelKey, index)}
                                    >
                                      <XIcon />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    ) : null}
                    <datalist id={`notion-field-options-${model.modelKey}`}>
                      {(schemaReport?.availableProperties ?? []).map((property) => (
                        <option key={`${model.modelKey}-opt-${property.name}`} value={property.name} />
                      ))}
                    </datalist>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={resolveDialog.open} onOpenChange={(open) => !open && setResolveDialog({ open: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Field Mapping</DialogTitle>
            <DialogDescription>
              {resolveDialog.open && resolveDialog.mode === "model_field"
                ? `App field: ${resolveDialog.modelField.appField}`
                : resolveDialog.open
                  ? `Notion field: ${resolveDialog.property.name}`
                  : ""}
            </DialogDescription>
          </DialogHeader>

          {resolveDialog.open && resolveDialog.mode === "model_field" ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-xs font-medium">1) Edit Notion Field Name</p>
                <input
                  className="w-full border px-2 py-1 text-xs"
                  value={resolveDialog.notionFieldNameDraft}
                  onChange={(event) =>
                    setResolveDialog({ ...resolveDialog, notionFieldNameDraft: event.target.value })
                  }
                />
                <Button variant="outline" size="sm" onClick={() => void onResolveEditNotionFieldName()}>
                  Apply Name
                </Button>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium">2) Connect Existing Notion Field</p>
                <select
                  className="w-full border px-2 py-1 text-xs"
                  value={resolveDialog.connectPropertyName}
                  onChange={(event) =>
                    setResolveDialog({ ...resolveDialog, connectPropertyName: event.target.value })
                  }
                >
                  <option value="">Select Notion property</option>
                  {resolveDialog.schemaReport.availableProperties.map((property) => (
                    <option key={`resolve-${property.name}`} value={property.name}>
                      {property.name} ({property.type})
                    </option>
                  ))}
                </select>
                <Button variant="outline" size="sm" onClick={() => void onResolveConnectExisting()}>
                  Connect Existing
                </Button>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium">3) Patch Notion DB</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void onPatchFieldToNotion(
                      resolveDialog.model.modelKey,
                      resolveDialog.check.expectedNotionField
                    )
                  }
                >
                  Patch Notion DB
                </Button>
              </div>
            </div>
          ) : null}

          {resolveDialog.open && resolveDialog.mode === "notion_only" ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-xs font-medium">1) Connect Existing Unlinked App Field</p>
                <select
                  className="w-full border px-2 py-1 text-xs"
                  value={resolveDialog.connectAppField}
                  onChange={(event) =>
                    setResolveDialog({ ...resolveDialog, connectAppField: event.target.value })
                  }
                >
                  <option value="">Select App field</option>
                  {resolveDialog.schemaReport.checks
                    .filter((check) => check.status !== "ok" && check.expectedType !== "builtin")
                    .map((check) => (
                      <option key={`connect-${check.appField}`} value={check.appField}>
                        {check.appField}
                      </option>
                    ))}
                </select>
                <Button variant="outline" size="sm" onClick={() => void onResolveConnectExisting()}>
                  Connect Existing
                </Button>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium">2) Patch Model</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void onPatchPropertyToModel(resolveDialog.model, resolveDialog.property)}
                >
                  Patch Model
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {notice ? (
        <p className={notice.variant === "destructive" ? "text-xs text-destructive" : "text-xs"}>
          {notice.message}
        </p>
      ) : null}
    </div>
  );
}

function normalizeOptionalValue(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isBuiltinTypeSelection(value: string): boolean {
  return value.startsWith("builtin:");
}

function resolveTypeSelection(typeSelection: string): {
  expectedType: string;
  builtinField: string | null;
} {
  if (isBuiltinTypeSelection(typeSelection)) {
    return {
      expectedType: "builtin",
      builtinField: typeSelection.slice("builtin:".length),
    };
  }

  return {
    expectedType: typeSelection,
    builtinField: null,
  };
}

function createFieldDraft(field: NotionModelFieldDto): EditableFieldDraft {
  return {
    fieldKey: field.fieldKey,
    notionField: field.defaultNotionField ?? "",
    typeSelection:
      field.expectedType === "builtin" && field.builtinField
        ? `builtin:${field.builtinField}`
        : field.expectedType,
    required: field.required,
    description: field.description ?? "",
  };
}

function createEmptyFieldDraft(): EditableFieldDraft {
  return {
    fieldKey: "",
    notionField: "",
    typeSelection: "rich_text",
    required: false,
    description: "",
  };
}

function resolveSchemaReport(
  schemaMapping: NotionSchemaMappingResultDto | null,
  source: string
): NotionSchemaMappingReportDto | null {
  if (!schemaMapping) {
    return null;
  }
  return schemaMapping.reports.find((report) => report.source === source) ?? null;
}

function getNotionOnlyProperties(
  report: NotionSchemaMappingReportDto
): Array<{ name: string; type: string }> {
  const matchedNames = new Set<string>();
  for (const check of report.checks) {
    if (check.expectedType === "builtin") {
      continue;
    }
    if (check.expectedNotionField) {
      matchedNames.add(check.expectedNotionField);
    }
    if (check.selectedNotionField) {
      matchedNames.add(check.selectedNotionField);
    }
    if (check.matchedName) {
      matchedNames.add(check.matchedName);
    }
  }
  return report.availableProperties.filter((property) => !matchedNames.has(property.name));
}

function mapNotionPropertyTypeToExpectedType(type: string): string {
  if (
    type === "title" ||
    type === "rich_text" ||
    type === "select" ||
    type === "multi_select" ||
    type === "status" ||
    type === "number" ||
    type === "date" ||
    type === "checkbox" ||
    type === "url" ||
    type === "file" ||
    type === "media"
  ) {
    return type;
  }
  if (type === "files") {
    return "file";
  }
  return "rich_text";
}

function generateFieldKeyFromProperty(
  notionPropertyName: string,
  existingFields: NotionModelFieldDto[]
): string {
  const normalized = notionPropertyName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const base = normalized && /^[a-z]/.test(normalized) ? normalized : `field_${normalized || "new"}`;
  const taken = new Set(existingFields.map((field) => field.fieldKey));
  if (!taken.has(base)) {
    return base;
  }
  let i = 2;
  while (taken.has(`${base}_${i}`)) {
    i += 1;
  }
  return `${base}_${i}`;
}

function displayFieldType(field: NotionModelFieldDto): string {
  if (field.expectedType === "builtin" && field.builtinField) {
    if (field.builtinField === "page.icon") return "icon";
    if (field.builtinField === "page.cover") return "cover";
    if (field.builtinField === "page.created_time") return "created_time";
    if (field.builtinField === "page.last_edited_time") return "last_edited_time";
  }
  return field.expectedType;
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 6V4H16V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M19 6L18 20H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function RequiredPill({ required }: { required: boolean }) {
  return (
    <span
      className={
        required
          ? "inline-flex items-center gap-1 rounded-none border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-300"
          : "inline-flex items-center gap-1 rounded-none border border-muted px-2 py-0.5 text-[11px] text-muted-foreground"
      }
    >
      {required ? <CheckIcon /> : <XIcon />}
      {required ? "required" : "optional"}
    </span>
  );
}

function FieldStatusPill({
  status,
  label,
}: {
  status: "ok" | "missing_required" | "missing_optional" | "type_mismatch";
  label?: string;
}) {
  if (status === "ok") {
    return (
      <span className="inline-flex items-center gap-1 rounded-none border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-300">
        <CheckIcon />
        {label ?? "ok"}
      </span>
    );
  }

  if (status === "missing_optional") {
    return (
      <span className="inline-flex items-center gap-1 rounded-none border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-700 dark:text-amber-300">
        <XIcon />
        {label ?? "missing_optional"}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-none border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[11px] text-destructive">
      <XIcon />
      {label ?? status}
    </span>
  );
}

function FieldTypeBadge({ type }: { type: string }) {
  const normalized = type.trim().toLowerCase();
  const icon = typeIconText(normalized);
  return (
    <span className="inline-flex items-center gap-1 rounded-none border border-muted px-2 py-0.5 text-[11px]">
      <span className="inline-flex h-4 w-4 items-center justify-center border text-[9px] font-semibold">{icon}</span>
      {type}
    </span>
  );
}

function typeIconText(type: string): string {
  switch (type) {
    case "title":
      return "T";
    case "rich_text":
      return "R";
    case "select":
      return "S";
    case "multi_select":
      return "M";
    case "status":
      return "S";
    case "number":
      return "#";
    case "date":
      return "D";
    case "checkbox":
      return "C";
    case "url":
      return "U";
    case "file":
      return "F";
    case "media":
      return "M";
    case "icon":
      return "I";
    case "cover":
      return "C";
    case "created_time":
      return "C";
    case "last_edited_time":
      return "L";
    default:
      return "?";
  }
}
