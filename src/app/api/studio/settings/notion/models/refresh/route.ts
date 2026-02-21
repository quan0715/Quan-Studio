import { jsonSuccess } from "@/interface/http/api-response";
import { getContainer } from "@/interface/container";
import { handleApiRequest } from "@/interface/http/handler";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return handleApiRequest(request, async () => {
    const container = getContainer();
    const settings = await container.getNotionModelSettingsUseCase.execute();
    return jsonSuccess(settings);
  });
}
