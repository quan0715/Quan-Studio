import { jsonSuccess } from "@/interface/http/api-response";
import { getContainer } from "@/interface/container";
import { handleApiRequest } from "@/interface/http/handler";
import { parseSyncJobsLimit } from "@/interface/http/validators";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleApiRequest(request, async () => {
    const limit = parseSyncJobsLimit(request.url, 50);
    const pages = await getContainer().listNotionDataSourcePagesUseCase.execute(limit);

    return jsonSuccess(pages);
  });
}
