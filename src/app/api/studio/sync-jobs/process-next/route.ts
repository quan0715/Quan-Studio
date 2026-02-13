import { jsonSuccess } from "@/interface/http/api-response";
import { getContainer } from "@/interface/container";
import { handleApiRequest } from "@/interface/http/handler";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return handleApiRequest(request, async () => {
    const lockId = `api:${crypto.randomUUID()}`;
    const result = await getContainer().processNextNotionSyncJobUseCase.execute(lockId);

    return jsonSuccess(result);
  });
}
