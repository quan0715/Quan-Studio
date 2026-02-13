"use client";

import { useState } from "react";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import {
  getStudioNotionSettings,
  testStudioNotionSettings,
  updateStudioNotionSettings,
} from "@/presentation/lib/studio-settings-api";
import type {
  NotionDataSourceSettingsDto,
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
  const [testResult, setTestResult] = useState<NotionDataSourceTestResultDto | null>(null);

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
    </div>
  );
}
