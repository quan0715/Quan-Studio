import { env } from "@/infrastructure/config/env";
import { jsonSuccess } from "@/interface/http/api-response";
import { getContainer } from "@/interface/container";
import { toNotionSyncJobDto } from "@/interface/dto/notion-sync-job-dto";
import { handleApiRequest } from "@/interface/http/handler";
import { parseNotionWebhookButtonPayload } from "@/interface/http/validators";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return handleApiRequest(request, async () => {
    const payload = await parseNotionWebhookButtonPayload(request, env.notionWebhookSharedSecret);

    const job = await getContainer().enqueueNotionSyncJobUseCase.execute({
      pageId: payload.pageId,
      triggerType: "button",
      dedupeKey: payload.dedupeKey,
      payload: payload.payload,
    });

    return jsonSuccess(toNotionSyncJobDto(job), 202);
  });
}
