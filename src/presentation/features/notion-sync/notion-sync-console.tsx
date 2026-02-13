"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  enqueueNotionSyncJob,
  processNextNotionSyncJobOnce,
  retryNotionSyncJob,
} from "@/presentation/lib/notion-sync-api";
import { formatIsoToUtcDateTime } from "@/presentation/lib/date-time";
import type { NotionSyncJobDto } from "@/presentation/types/notion-sync";

type NotionSyncConsoleProps = {
  jobs: NotionSyncJobDto[];
};

function formatDateLabel(value: string | null) {
  return formatIsoToUtcDateTime(value);
}

function badgeVariantByStatus(status: NotionSyncJobDto["status"]): "outline" | "secondary" | "default" | "destructive" {
  switch (status) {
    case "pending":
      return "secondary";
    case "processing":
      return "default";
    case "succeeded":
      return "outline";
    case "failed":
      return "destructive";
  }
}

export function NotionSyncConsole({ jobs }: NotionSyncConsoleProps) {
  const router = useRouter();
  const [pageId, setPageId] = useState("");
  const [isEnqueueing, setIsEnqueueing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);

  const latestError = useMemo(() => {
    return jobs.find((job) => job.errorMessage)?.errorMessage ?? null;
  }, [jobs]);

  async function onEnqueue() {
    setIsEnqueueing(true);
    const result = await enqueueNotionSyncJob(pageId);
    setIsEnqueueing(false);

    if (!result.ok) {
      window.alert(result.error.message);
      return;
    }

    setPageId("");
    router.refresh();
  }

  async function onRetry(jobId: string) {
    setRetryingJobId(jobId);
    const result = await retryNotionSyncJob(jobId);
    setRetryingJobId(null);

    if (!result.ok) {
      window.alert(result.error.message);
      return;
    }

    router.refresh();
  }

  async function onProcessNext() {
    setIsProcessing(true);
    const result = await processNextNotionSyncJobOnce();
    setIsProcessing(false);

    if (!result.ok) {
      window.alert(result.error.message);
      return;
    }

    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle>Notion Sync Queue</CardTitle>
        <p className="text-muted-foreground text-xs">
          Use Notion webhook button in production. Here you can enqueue and process jobs manually.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={pageId}
            placeholder="Notion Page ID"
            onChange={(event) => {
              setPageId(event.target.value);
            }}
          />
          <Button
            variant="secondary"
            disabled={isEnqueueing}
            onClick={() => {
              void onEnqueue();
            }}
          >
            {isEnqueueing ? "Enqueueing..." : "Enqueue"}
          </Button>
          <Button
            variant="outline"
            disabled={isProcessing}
            onClick={() => {
              void onProcessNext();
            }}
          >
            {isProcessing ? "Processing..." : "Process Next"}
          </Button>
        </div>

        {latestError && (
          <p className="text-xs text-destructive">Latest failure: {latestError}</p>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Page ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead>Attempt</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead>Error</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell className="font-mono text-[11px]">{job.pageId}</TableCell>
                <TableCell>
                  <Badge variant={badgeVariantByStatus(job.status)}>{job.status}</Badge>
                </TableCell>
                <TableCell>{job.triggerType}</TableCell>
                <TableCell>{`${job.attempt}/${job.maxAttempts}`}</TableCell>
                <TableCell>{formatDateLabel(job.updatedAt)}</TableCell>
                <TableCell className="max-w-[280px] truncate">{job.errorMessage ?? "-"}</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={job.status !== "failed" || retryingJobId === job.id}
                    onClick={() => {
                      void onRetry(job.id);
                    }}
                  >
                    {retryingJobId === job.id ? "Retrying..." : "Retry"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {jobs.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">
                  No sync jobs yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
