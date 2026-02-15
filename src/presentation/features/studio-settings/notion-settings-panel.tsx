"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/presentation/components/ui/table";
import {
  getNotionSchemaMapping,
  getStudioNotionSettings,
  testStudioNotionSettings,
  updateNotionSchemaMapping,
  updateStudioNotionSettings,
} from "@/presentation/lib/studio-settings-api";
import type {
  NotionDataSourceSettingsDto,
  NotionSchemaFieldCheckDto,
  NotionSchemaMappingReportDto,
  NotionSchemaMappingResultDto,
  NotionDataSourceTestResultDto,
} from "@/presentation/types/studio-settings";

type NotionSettingsPanelProps = {
  initialSettings: NotionDataSourceSettingsDto;
};

type Notice =
  | {
      variant: "default" | "destructive";
      message: string;
    }
  | null;

function sourceBadgeVariant(
  source: NotionDataSourceSettingsDto["source"]["blog"]
): "default" | "destructive" {
  if (source === "database") {
    return "default";
  }

  return "destructive";
}

export function NotionSettingsPanel({ initialSettings }: NotionSettingsPanelProps) {
  const [settings, setSettings] = useState<NotionDataSourceSettingsDto>(initialSettings);
  const [blogDataSourceId, setBlogDataSourceId] = useState(initialSettings.blogDataSourceId);
  const [resumeDataSourceId, setResumeDataSourceId] = useState(initialSettings.resumeDataSourceId);
  const [notice, setNotice] = useState<Notice>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [isSchemaChecking, setIsSchemaChecking] = useState(false);
  const [savingMappingKey, setSavingMappingKey] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<NotionDataSourceTestResultDto | null>(null);
  const [schemaMapping, setSchemaMapping] = useState<NotionSchemaMappingResultDto | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      setIsSchemaChecking(true);
      const response = await getNotionSchemaMapping();
      if (!active) {
        return;
      }
      setIsSchemaChecking(false);

      if (!response.ok) {
        setSchemaMapping(null);
        return;
      }

      setSchemaMapping(response.data);
    })();

    return () => {
      active = false;
    };
  }, []);

  async function onSave() {
    setIsSaving(true);
    setNotice(null);

    const response = await updateStudioNotionSettings({
      blogDataSourceId,
      resumeDataSourceId,
    });

    setIsSaving(false);

    if (!response.ok) {
      setNotice({
        variant: "destructive",
        message: response.error.message,
      });
      return;
    }

    setSettings(response.data);
    setBlogDataSourceId(response.data.blogDataSourceId);
    setResumeDataSourceId(response.data.resumeDataSourceId);
    setNotice({
      variant: "default",
      message: "Notion data source settings saved.",
    });
  }

  async function onTest() {
    setIsTesting(true);
    setNotice(null);
    const response = await testStudioNotionSettings();
    setIsTesting(false);

    if (!response.ok) {
      setTestResult(null);
      setNotice({
        variant: "destructive",
        message: response.error.message,
      });
      return;
    }

    setTestResult(response.data);
    const allPassed = response.data.blog.ok && response.data.resume.ok && response.data.envConfig.ok;
    setNotice({
      variant: allPassed ? "default" : "destructive",
      message: allPassed ? "Connection test passed." : "Connection test has failures.",
    });
  }

  async function onReload() {
    setIsReloading(true);
    setNotice(null);
    const response = await getStudioNotionSettings();
    setIsReloading(false);

    if (!response.ok) {
      setNotice({
        variant: "destructive",
        message: response.error.message,
      });
      return;
    }

    setSettings(response.data);
    setBlogDataSourceId(response.data.blogDataSourceId);
    setResumeDataSourceId(response.data.resumeDataSourceId);
    setNotice({
      variant: "default",
      message: "Settings reloaded.",
    });
  }

  async function onCheckSchemaMapping() {
    setIsSchemaChecking(true);
    setNotice(null);
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

  async function onChangeFieldMapping(
    source: "blog" | "resume",
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
          <CardTitle>Notion Data Source Settings</CardTitle>
          <p className="text-muted-foreground text-xs">
            `NOTION_API_TOKEN` and `NOTION_ENV_DATABASE_ID` stay in environment variables. Data source IDs are managed here.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium">Blog Data Source ID</p>
              <Badge variant={sourceBadgeVariant(settings.source.blog)}>{settings.source.blog}</Badge>
            </div>
            <Input
              value={blogDataSourceId}
              onChange={(event) => {
                setBlogDataSourceId(event.target.value);
              }}
              placeholder="Notion blog data source id"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium">Resume Data Source ID</p>
              <Badge variant={sourceBadgeVariant(settings.source.resume)}>{settings.source.resume}</Badge>
            </div>
            <Input
              value={resumeDataSourceId}
              onChange={(event) => {
                setResumeDataSourceId(event.target.value);
              }}
              placeholder="Notion resume data source id"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={isSaving}
              onClick={() => {
                void onSave();
              }}
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
            <Button
              variant="secondary"
              disabled={isTesting}
              onClick={() => {
                void onTest();
              }}
            >
              {isTesting ? "Testing..." : "Test Connection"}
            </Button>
            <Button
              variant="outline"
              disabled={isReloading}
              onClick={() => {
                void onReload();
              }}
            >
              {isReloading ? "Reloading..." : "Reload"}
            </Button>
            <Button
              variant="outline"
              disabled={isSchemaChecking}
              onClick={() => {
                void onCheckSchemaMapping();
              }}
            >
              {isSchemaChecking ? "Checking..." : "Check Schema Mapping"}
            </Button>
          </div>

          {notice ? (
            <p className={notice.variant === "destructive" ? "text-destructive text-xs" : "text-xs"}>
              {notice.message}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {testResult ? (
        <Card>
          <CardHeader>
            <CardTitle>Connection Test Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div>
              <p className="font-medium">Blog</p>
              <p className={testResult.blog.ok ? "text-foreground" : "text-destructive"}>
                {testResult.blog.ok ? "OK" : "FAILED"} - {testResult.blog.message}
              </p>
            </div>
            <div>
              <p className="font-medium">Resume</p>
              <p className={testResult.resume.ok ? "text-foreground" : "text-destructive"}>
                {testResult.resume.ok ? "OK" : "FAILED"} - {testResult.resume.message}
              </p>
            </div>
            <div>
              <p className="font-medium">NOTION.ENV</p>
              <p className={testResult.envConfig.ok ? "text-foreground" : "text-destructive"}>
                {testResult.envConfig.ok ? "OK" : "FAILED"} - {testResult.envConfig.message}
              </p>
              <p className="text-muted-foreground">
                databaseId: {testResult.envConfig.notionEnvDatabaseId || "-"} / dataSourceId:{" "}
                {testResult.envConfig.notionEnvDataSourceId || "-"}
              </p>
              {testResult.envConfig.availableKeys.length > 0 ? (
                <p className="text-muted-foreground">
                  keys: {testResult.envConfig.availableKeys.join(", ")}
                </p>
              ) : null}
              {testResult.envConfig.checks.length > 0 ? (
                <div className="mt-1 space-y-1">
                  {testResult.envConfig.checks.map((item) => (
                    <p
                      key={item.credential}
                      className={item.keyExists && item.valuePresent ? "text-foreground" : "text-destructive"}
                    >
                      {item.credential} {"<-"} {item.notionKey}:{" "}
                      {item.keyExists && item.valuePresent ? "READY" : "MISSING"}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {schemaMapping ? (
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle>Schema Mapping (App {"<->"} Notion)</CardTitle>
            <p className="text-xs text-muted-foreground">
              Compare expected fields in code with actual Notion data source properties.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {schemaMapping.reports.map((report) => (
              <div key={report.source} className="space-y-2 rounded-md border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">
                    {report.source === "blog" ? "Blog Data Source" : "Resume Data Source"}
                  </p>
                  <Badge variant={report.ok ? "default" : "destructive"}>
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
                                <p className="text-muted-foreground text-[11px]">Notion built-in field</p>
                              </div>
                            ) : (
                              <select
                                className="h-8 min-w-[220px] rounded-md border bg-background px-2 text-xs"
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
                            )}
                            <p className="mt-1 text-muted-foreground text-[11px]">
                              default: {check.expectedNotionField}
                            </p>
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
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function SchemaStatusBadge({ status }: { status: NotionSchemaFieldCheckDto["status"] }) {
  if (status === "ok") {
    return <Badge variant="default">OK</Badge>;
  }
  if (status === "missing_optional") {
    return <Badge variant="outline">Optional Missing</Badge>;
  }
  if (status === "missing_required") {
    return <Badge variant="destructive">Missing Required</Badge>;
  }

  return <Badge variant="destructive">Type Mismatch</Badge>;
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
