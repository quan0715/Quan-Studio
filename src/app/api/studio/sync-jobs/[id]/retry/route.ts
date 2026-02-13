import { jsonSuccess } from "@/interface/http/api-response";
import { getContainer } from "@/interface/container";
import { toNotionSyncJobDto } from "@/interface/dto/notion-sync-job-dto";
import { handleApiRequest } from "@/interface/http/handler";

export const runtime = "nodejs";

type ParamsContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: ParamsContext): Promise<Response> {
  return handleApiRequest(request, async () => {
    const { id } = await context.params;
    const job = await getContainer().retryNotionSyncJobUseCase.execute(id);

    return jsonSuccess(toNotionSyncJobDto(job));
  });
}
