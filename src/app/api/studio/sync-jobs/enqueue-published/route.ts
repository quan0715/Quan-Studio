import { jsonError, jsonSuccess } from "@/interface/http/api-response";
import { getContainer } from "@/interface/container";
import { handleApiRequest } from "@/interface/http/handler";
import { isInternalWorkerRequest } from "@/interface/http/internal-worker-auth";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  if (!isInternalWorkerRequest(request)) {
    return jsonError("UNAUTHORIZED", "internal worker token required", 401);
  }

  return handleApiRequest(request, async () => {
    const result = await getContainer().enqueuePublishedNotionSyncJobsUseCase.execute();
    return jsonSuccess(result);
  });
}
