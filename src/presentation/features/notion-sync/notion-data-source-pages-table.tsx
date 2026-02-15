"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import { formatIsoToUtcDateTime } from "@/presentation/lib/date-time";
import { enqueueNotionSyncJob, getNotionSyncJobs } from "@/presentation/lib/notion-sync-api";
import type { NotionDataSourcePageDto, NotionSyncJobDto } from "@/presentation/types/notion-sync";

type NotionDataSourcePagesTableProps = {
  pages: NotionDataSourcePageDto[];
};

function formatDateLabel(value: string | null) {
  return formatIsoToUtcDateTime(value);
}

function statusBadgeVariant(status: string | null): "default" | "outline" {
  if (!status) {
    return "outline";
  }

  return status.toLowerCase() === "published" ? "default" : "outline";
}

function syncStatusBadgeVariant(
  status: NotionSyncJobDto["status"] | null
): "outline" | "secondary" | "default" | "destructive" {
  switch (status) {
    case "pending":
      return "secondary";
    case "processing":
      return "default";
    case "succeeded":
      return "outline";
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
}

function syncCheckBadgeVariant(requiresSync: boolean): "default" | "outline" {
  return requiresSync ? "default" : "outline";
}

type SyncStatusMap = Record<string, NotionSyncJobDto["status"]>;
type SyncErrorMap = Record<string, string | null>;
type ActiveSyncPageMap = Record<string, true>;

export function NotionDataSourcePagesTable({ pages }: NotionDataSourcePagesTableProps) {
  const router = useRouter();
  const [syncStatuses, setSyncStatuses] = useState<SyncStatusMap>({});
  const [syncErrors, setSyncErrors] = useState<SyncErrorMap>({});
  const [activeSyncPages, setActiveSyncPages] = useState<ActiveSyncPageMap>({});
  const activeSyncPageIdsRef = useRef<Set<string>>(new Set());
  const pollingTimerRef = useRef<number | null>(null);
  const isPollingRef = useRef(false);

  const stopPollingLoop = useCallback(() => {
    if (pollingTimerRef.current !== null) {
      window.clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }, []);

  const pollSyncStatuses = useCallback(async () => {
    if (isPollingRef.current || activeSyncPageIdsRef.current.size === 0) {
      return;
    }

    isPollingRef.current = true;
    const response = await getNotionSyncJobs(100);
    isPollingRef.current = false;

    if (!response.ok) {
      return;
    }

    const latestJobByPageId = new Map<string, NotionSyncJobDto>();
    for (const job of response.data) {
      if (!latestJobByPageId.has(job.pageId)) {
        latestJobByPageId.set(job.pageId, job);
      }
    }

    const statusUpdates: SyncStatusMap = {};
    const errorUpdates: SyncErrorMap = {};
    const terminalPageIds: string[] = [];

    for (const pageId of activeSyncPageIdsRef.current) {
      const latest = latestJobByPageId.get(pageId);
      if (!latest) {
        continue;
      }

      statusUpdates[pageId] = latest.status;
      errorUpdates[pageId] = latest.errorMessage ?? null;

      if (latest.status === "succeeded" || latest.status === "failed") {
        terminalPageIds.push(pageId);
      }
    }

    if (Object.keys(statusUpdates).length > 0) {
      setSyncStatuses((previous) => ({ ...previous, ...statusUpdates }));
      setSyncErrors((previous) => ({ ...previous, ...errorUpdates }));
    }

    if (terminalPageIds.length > 0) {
      setActiveSyncPages((previous) => {
        const next = { ...previous };
        for (const pageId of terminalPageIds) {
          delete next[pageId];
          activeSyncPageIdsRef.current.delete(pageId);
        }
        return next;
      });
      router.refresh();
    }

    if (activeSyncPageIdsRef.current.size === 0) {
      stopPollingLoop();
    }
  }, [router, stopPollingLoop]);

  const startPollingLoop = useCallback(() => {
    if (pollingTimerRef.current !== null) {
      return;
    }

    pollingTimerRef.current = window.setInterval(() => {
      void pollSyncStatuses();
    }, 2000);
  }, [pollSyncStatuses]);

  useEffect(() => {
    return () => {
      stopPollingLoop();
    };
  }, [stopPollingLoop]);

  async function onSync(pageId: string) {
    setActiveSyncPages((previous) => ({ ...previous, [pageId]: true }));
    activeSyncPageIdsRef.current.add(pageId);
    setSyncStatuses((previous) => ({ ...previous, [pageId]: "pending" }));
    setSyncErrors((previous) => ({ ...previous, [pageId]: null }));

    const result = await enqueueNotionSyncJob(pageId);

    if (!result.ok) {
      setActiveSyncPages((previous) => {
        const next = { ...previous };
        delete next[pageId];
        return next;
      });
      activeSyncPageIdsRef.current.delete(pageId);
      setSyncStatuses((previous) => ({ ...previous, [pageId]: "failed" }));
      setSyncErrors((previous) => ({ ...previous, [pageId]: result.error.message }));
      if (activeSyncPageIdsRef.current.size === 0) {
        stopPollingLoop();
      }
      window.alert(result.error.message);
      return;
    }

    setSyncStatuses((previous) => ({ ...previous, [pageId]: result.data.status }));
    setSyncErrors((previous) => ({ ...previous, [pageId]: result.data.errorMessage ?? null }));
    startPollingLoop();
    void pollSyncStatuses();
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle>Quan Studio Articles (Notion)</CardTitle>
        <p className="text-muted-foreground text-xs">
          Loaded from your Notion data source. Click Sync to enqueue a selected page.
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Notion Status</TableHead>
              <TableHead>Sync Status</TableHead>
              <TableHead>Notion Updated</TableHead>
              <TableHead>Last Synced</TableHead>
              <TableHead>Sync Check</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pages.map((page) => (
              <TableRow key={page.pageId}>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{page.title}</span>
                    <span className="text-muted-foreground font-mono text-[11px]">{page.pageId}</span>
                    {page.tags.length > 0 ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {page.tags.map((tag) => (
                          <Badge key={`${page.pageId}-${tag}`} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-xs">{page.slug ?? "-"}</TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariant(page.status)}>{page.status ?? "Unknown"}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={syncStatusBadgeVariant(syncStatuses[page.pageId] ?? null)}>
                    {syncStatuses[page.pageId] ?? "-"}
                  </Badge>
                  {syncErrors[page.pageId] && (
                    <p className="mt-1 max-w-[220px] truncate text-[11px] text-destructive">
                      {syncErrors[page.pageId]}
                    </p>
                  )}
                </TableCell>
                <TableCell>{formatDateLabel(page.lastEditedTime)}</TableCell>
                <TableCell>{formatDateLabel(page.lastSyncedAt)}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Badge variant={syncCheckBadgeVariant(page.requiresSync)}>
                      {page.requiresSync ? "Needs Update" : "Up to Date"}
                    </Badge>
                    <p className="text-muted-foreground text-[11px]">
                      Last synced edit: {formatDateLabel(page.lastSyncedNotionEditedTime)}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={page.url} target="_blank" rel="noreferrer noopener">
                        Open Notion
                      </Link>
                    </Button>
                    {page.websiteUrl ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={page.websiteUrl} target="_blank" rel="noreferrer noopener">
                          Open Blog
                        </Link>
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled>
                        Open Blog
                      </Button>
                    )}
                    <Button
                      size="sm"
                      disabled={Boolean(activeSyncPages[page.pageId])}
                      onClick={() => {
                        void onSync(page.pageId);
                      }}
                    >
                      {activeSyncPages[page.pageId] ? "Syncing..." : "Sync"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {pages.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground text-center text-sm">
                  No pages found in configured blog data source.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
