import { jsonSuccess } from "@/interface/http/api-response";
import { getContainer } from "@/interface/container";
import { handleApiRequest } from "@/interface/http/handler";
import { parseStudioNotionModelSelectSourcePayload } from "@/interface/http/validators";

export const runtime = "nodejs";

export async function PATCH(request: Request): Promise<Response> {
  return handleApiRequest(request, async () => {
    const container = getContainer();
    const payload = await parseStudioNotionModelSelectSourcePayload(request);
    await container.selectNotionModelSourceUseCase.execute(payload);
    const settings = await container.getNotionModelSettingsUseCase.execute();
    return jsonSuccess(settings);
  });
}
