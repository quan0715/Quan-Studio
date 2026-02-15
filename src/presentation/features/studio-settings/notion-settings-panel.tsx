"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/presentation/components/ui/card";
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
  getNotionModelSettings,
  getNotionSchemaMapping,
  refreshNotionModelSettings,
  selectNotionModelSource,
  updateNotionSchemaMapping,
} from "@/presentation/lib/studio-settings-api";
import type {
  NotionModelSettingsDto,
  NotionModelTemplate,
  NotionModelTemplateInfoDto,
  RegisteredModelDto,
  NotionSchemaFieldCheckDto,
  NotionSchemaMappingReportDto,
  NotionSchemaMappingResultDto,
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

export function NotionSettingsPanel({ initialSettings }: NotionSettingsPanelProps) {
  const [settings, setSettings] = useState<NotionModelSettingsDto>(initialSettings);
  const [notice, setNotice] = useState<Notice>(null);
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);
  const [isSchemaChecking, setIsSchemaChecking] = useState(false);
  const [bindingTemplate, setBindingTemplate] = useState<string | null>(null);
  const [savingMappingKey, setSavingMappingKey] = useState<string | null>(null);
  const [schemaMapping, setSchemaMapping] = useState<NotionSchemaMappingResultDto | null>(null);
  const [activeSchemaTab, setActiveSchemaTab] = useState<string>("");

  useEffect(() => {
    let active = true;
    void (async () => {
      setIsRefreshingModels(true);
      setIsSchemaChecking(true);
      const [modelsResponse, schemaResponse] = await Promise.all([
        getNotionModelSettings(),
        getNotionSchemaMapping(),
      ]);
      if (!active) {
        return;
      }

      setIsRefreshingModels(false);
      setIsSchemaChecking(false);

      if (modelsResponse.ok) {
        setSettings(modelsResponse.data);
      }

      if (schemaResponse.ok) {
        setSchemaMapping(schemaResponse.data);
      } else {
        setSchemaMapping(null);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const resolvedActiveSchemaTab =
    schemaMapping && schemaMapping.reports.some((report) => report.source === activeSchemaTab)
      ? activeSchemaTab
      : (schemaMapping?.reports[0]?.source ?? "");

  async function loadSchemaMapping(): Promise<void> {
    setIsSchemaChecking(true);
    const response = await getNotionSchemaMapping();
    setIsSchemaChecking(false);

    if (!response.ok) {
      setSchemaMapping(null);
      setNotice({
        variant: "destructive",
        message: response.error.message,
      });
      return;
    }

    setSchemaMapping(response.data);
  }

  async function onRefreshCandidates() {
    setIsRefreshingModels(true);
    setNotice(null);
    const response = await refreshNotionModelSettings();
    setIsRefreshingModels(false);

    if (!response.ok) {
      setNotice({
        variant: "destructive",
        message: response.error.message,
      });
      return;
    }

    setSettings(response.data);
    setNotice({
      variant: "default",
      message: "Source page data sources refreshed.",
    });
  }

  async function onBindSource(template: NotionModelTemplate, dataSourceId: string) {
    if (!dataSourceId.trim()) {
      return;
    }

    setBindingTemplate(template);
    setNotice(null);
    const response = await selectNotionModelSource({
      template,
      dataSourceId,
    });
    setBindingTemplate(null);

    if (!response.ok) {
      setNotice({
        variant: "destructive",
        message: response.error.message,
      });
      return;
    }

    setSettings(response.data);
    await loadSchemaMapping();
    setNotice({
      variant: "default",
      message: `${template} source mapped.`,
    });
  }

  async function onChangeFieldMapping(
    source: string,
    appField: string,
    notionField: string
  ) {
    const mappingKey = `${source}:${appField}`;
    setSavingMappingKey(mappingKey);
    setNotice(null);

    const response = await updateNotionSchemaMapping({
      source,
      mappings: {
        [appField]: notionField.trim().length > 0 ? notionField : null,
      },
    });

    setSavingMappingKey(null);

    if (!response.ok) {
      setNotice({
        variant: "destructive",
        message: response.error.message,
      });
      return;
    }

    setSchemaMapping(response.data);
    setNotice({
      variant: "default",
      message: "Schema mapping saved.",
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle>Source Page Data Sources</CardTitle>
          <p className="text-xs text-muted-foreground">
            Source page id:{" "}
            <span className="font-mono">{settings.sourcePage.configured ? settings.sourcePage.id : "Not configured"}</span>
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={isRefreshingModels}
              onClick={() => {
                void onRefreshCandidates();
              }}
            >
              {isRefreshingModels ? "Refreshing..." : "Refresh Source Page"}
            </Button>
          </div>

          {settings.candidates.length === 0 ? (
            <p className="text-xs text-muted-foreground">No data sources found under current source page.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Database</TableHead>
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
                        <a
                          href={candidate.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-primary underline underline-offset-4"
                        >
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

      {notice ? (
        <p className={notice.variant === "destructive" ? "text-xs text-destructive" : "text-xs"}>
          {notice.message}
        </p>
      ) : null}

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle>Schema Mapping (App {"<->"} Notion)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Compare expected fields in code with actual Notion data source properties.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={isSchemaChecking}
              onClick={() => {
                void loadSchemaMapping();
              }}
            >
              {isSchemaChecking ? "Checking..." : "Check Schema Mapping"}
            </Button>
          </div>

          {!schemaMapping ? (
            <p className="text-xs text-muted-foreground">No schema reports.</p>
          ) : schemaMapping.reports.length === 0 ? (
            <p className="text-xs text-muted-foreground">No schema reports.</p>
          ) : (
            <Tabs
              value={resolvedActiveSchemaTab}
              onValueChange={setActiveSchemaTab}
              className="space-y-3"
            >
              <TabsList>
                {schemaMapping.reports.map((report) => (
                  <TabsTrigger key={report.source} value={report.source} className="min-w-[120px]">
                    {resolveSchemaSourceLabel(settings.availableTemplates, report.source)}
                  </TabsTrigger>
                ))}
              </TabsList>
              {schemaMapping.reports.map((report) => (
                <TabsContent key={report.source} value={report.source}>
                  <SchemaMappingReportPanel
                    report={report}
                    sourceLabel={resolveSchemaSourceLabel(settings.availableTemplates, report.source)}
                    bindingModel={resolveBindingModelBySource(
                      settings.availableTemplates,
                      settings.models,
                      report.source
                    )}
                    candidates={settings.candidates}
                    bindingTemplate={bindingTemplate}
                    savingMappingKey={savingMappingKey}
                    onBindSource={onBindSource}
                    onChangeFieldMapping={onChangeFieldMapping}
                  />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function resolveSchemaSourceLabel(
  templates: NotionModelTemplateInfoDto[],
  source: string
): string {
  const matched = templates.find((template) => template.schemaSource === source);
  return matched?.label ?? source;
}

function resolveBindingModelBySource(
  templates: NotionModelTemplateInfoDto[],
  models: RegisteredModelDto[],
  source: string
): RegisteredModelDto | null {
  const template = templates.find((item) => item.schemaSource === source);
  if (!template) {
    return null;
  }

  return models.find((model) => model.template === template.id) ?? null;
}

function SchemaStatusBadge({ status }: { status: NotionSchemaFieldCheckDto["status"] }) {
  if (status === "ok") {
    return (
      <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
        OK
      </Badge>
    );
  }
  if (status === "missing_optional") {
    return (
      <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300">
        Optional Missing
      </Badge>
    );
  }
  if (status === "missing_required") {
    return (
      <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive">
        Missing Required
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive">
      Type Mismatch
    </Badge>
  );
}

function SchemaMappingReportPanel({
  report,
  sourceLabel,
  bindingModel,
  candidates,
  bindingTemplate,
  savingMappingKey,
  onBindSource,
  onChangeFieldMapping,
}: {
  report: NotionSchemaMappingReportDto;
  sourceLabel: string;
  bindingModel: RegisteredModelDto | null;
  candidates: NotionModelSettingsDto["candidates"];
  bindingTemplate: string | null;
  savingMappingKey: string | null;
  onBindSource: (template: NotionModelTemplate, dataSourceId: string) => Promise<void>;
  onChangeFieldMapping: (
    source: string,
    appField: string,
    notionField: string
  ) => Promise<void>;
}) {
  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">{sourceLabel} Data Source</p>
        <Badge
          variant="outline"
          className={
            report.ok
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          }
        >
          {report.ok ? "PASS" : "ISSUES"}
        </Badge>
        {report.configured ? (
          <Badge variant="secondary" className="font-mono text-[11px]">
            {report.dataSourceId}
          </Badge>
        ) : (
          <Badge variant="outline">Not configured</Badge>
        )}
      </div>
      <p className={report.ok ? "text-xs text-muted-foreground" : "text-xs text-destructive"}>
        {report.message}
      </p>

      {bindingModel ? (
        <div className="space-y-2 rounded-md border border-dashed p-2">
          <p className="text-xs text-muted-foreground">
            Data source binding for <span className="font-medium">{bindingModel.displayName}</span>
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              aria-label={`bind-source-${bindingModel.template}`}
              className="border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 dark:aria-invalid:ring-destructive/40 aria-invalid:ring-destructive/20 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 h-8 min-w-[320px] rounded-none border bg-transparent px-2.5 text-xs transition-colors focus-visible:ring-1 outline-none disabled:cursor-not-allowed disabled:opacity-50"
              value={bindingModel.configuredDataSourceId ?? ""}
              disabled={bindingTemplate === bindingModel.template || candidates.length === 0}
              onChange={(event) => {
                void onBindSource(bindingModel.template, event.target.value);
              }}
            >
              <option value="">Select data source id</option>
              {candidates.map((candidate) => (
                <option
                  key={`${bindingModel.template}-${candidate.dataSourceId}`}
                  value={candidate.dataSourceId}
                >
                  {candidate.databaseTitle} ({candidate.dataSourceId})
                </option>
              ))}
            </select>
            <Badge
              variant="outline"
              className={
                bindingModel.configuredDataSourceId
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
              }
            >
              {bindingModel.configuredDataSourceId ? "Mapped" : "Unmapped"}
            </Badge>
          </div>
        </div>
      ) : null}

      {report.checks.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>App Field</TableHead>
              <TableHead>Notion Field</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.checks.map((check) => (
              <TableRow key={`${report.source}-${check.appField}`}>
                <TableCell>
                  <div className="space-y-0.5">
                    <p className="font-mono text-[11px]">{check.appField}</p>
                    <p className="text-xs text-muted-foreground">{check.description}</p>
                  </div>
                </TableCell>
                <TableCell className="text-xs">
                  {check.expectedType === "builtin" ? (
                    <div className="space-y-1">
                      <p className="font-mono">{check.matchedName ?? "-"}</p>
                      <p className="text-[11px] text-muted-foreground">Notion built-in field</p>
                    </div>
                  ) : (
                    <>
                      <select
                        className="border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 dark:aria-invalid:ring-destructive/40 aria-invalid:ring-destructive/20 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 h-8 min-w-[220px] rounded-none border bg-transparent px-2.5 text-xs transition-colors focus-visible:ring-1 outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        value={check.mappedExplicitly ? (check.selectedNotionField ?? "") : ""}
                        disabled={!report.configured || savingMappingKey === `${report.source}:${check.appField}`}
                        onChange={(event) => {
                          void onChangeFieldMapping(
                            report.source,
                            check.appField,
                            event.target.value
                          );
                        }}
                      >
                        <option value="">Auto (by default field)</option>
                        {toFeasibleMappingOptions(report, check).map((option) => (
                          <option key={`${report.source}-${check.appField}-${option.name}`} value={option.name}>
                            {option.name} ({option.type})
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        default: {check.expectedNotionField}
                      </p>
                    </>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  <p className="font-mono">{check.expectedType}</p>
                  {check.actualType ? (
                    <p className="text-muted-foreground">current: {check.actualType}</p>
                  ) : null}
                </TableCell>
                <TableCell>
                  <SchemaStatusBadge status={check.status} />
                  <p className="mt-1 max-w-[360px] text-[11px] text-muted-foreground">{check.message}</p>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}

      {report.availableProperties.length > 0 ? (
        <div className="space-y-1">
          <p className="text-xs font-medium">Notion Properties</p>
          <p className="text-xs text-muted-foreground">
            {report.availableProperties.map((item) => `${item.name}(${item.type})`).join(", ")}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function toFeasibleMappingOptions(
  report: NotionSchemaMappingReportDto,
  check: NotionSchemaFieldCheckDto
): Array<{ name: string; type: string }> {
  const filtered = report.availableProperties.filter((property) => check.expectedType === property.type);

  const selected = check.selectedNotionField
    ? report.availableProperties.find((property) => property.name === check.selectedNotionField)
    : undefined;
  if (selected && !filtered.some((item) => item.name === selected.name)) {
    filtered.push(selected);
  }

  return filtered;
}
