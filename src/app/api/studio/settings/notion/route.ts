import { jsonSuccess } from "@/interface/http/api-response";
import { getContainer } from "@/interface/container";
import { handleApiRequest } from "@/interface/http/handler";
import { parseStudioNotionSettingsPayload } from "@/interface/http/validators";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleApiRequest(request, async () => {
    const settings = await getContainer().getStudioNotionSettingsUseCase.execute();
    return jsonSuccess(settings);
  });
}

export async function PATCH(request: Request): Promise<Response> {
  return handleApiRequest(request, async () => {
    const payload = await parseStudioNotionSettingsPayload(request);
    const settings = await getContainer().updateStudioNotionSettingsUseCase.execute(payload);
    return jsonSuccess(settings);
  });
}
