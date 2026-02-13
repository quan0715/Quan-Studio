import { jsonSuccess } from "@/interface/http/api-response";
import { getContainer } from "@/interface/container";
import { toNotionSyncJobDto } from "@/interface/dto/notion-sync-job-dto";
import { handleApiRequest } from "@/interface/http/handler";
import { parseManualEnqueuePayload, parseSyncJobsLimit } from "@/interface/http/validators";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleApiRequest(request, async () => {
    const limit = parseSyncJobsLimit(request.url, 50);
    const jobs = await getContainer().listNotionSyncJobsUseCase.execute(limit);
    return jsonSuccess(jobs.map(toNotionSyncJobDto));
  });
}

export async function POST(request: Request): Promise<Response> {
  return handleApiRequest(request, async () => {
    const payload = await parseManualEnqueuePayload(request);

    const job = await getContainer().enqueueNotionSyncJobUseCase.execute({
      pageId: payload.pageId,
      triggerType: "manual",
      dedupeKey: payload.dedupeKey,
      payload: null,
    });

    return jsonSuccess(toNotionSyncJobDto(job), 201);
  });
}
