import { NotionSyncConsole } from "@/presentation/features/notion-sync/notion-sync-console";
import { serverApiRequest } from "@/presentation/lib/server-api-client";
import type { NotionSyncJobDto } from "@/presentation/types/notion-sync";

export default async function StudioSyncQueuePage() {
  const jobsResponse = await serverApiRequest<NotionSyncJobDto[]>("/api/studio/sync-jobs?limit=100");
  const jobs = jobsResponse.ok ? jobsResponse.data : [];

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Notion Sync Queue</h1>
        <p className="text-muted-foreground text-xs">
          Manage queue jobs: enqueue manual sync, process next task, and retry failed jobs.
        </p>
      </div>
      <NotionSyncConsole jobs={jobs} />
    </section>
  );
}
