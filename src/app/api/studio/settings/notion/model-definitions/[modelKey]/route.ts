import { jsonSuccess } from "@/interface/http/api-response";
import { getContainer } from "@/interface/container";
import { handleApiRequest } from "@/interface/http/handler";
import { parseStudioUpdateModelDefinitionPayload } from "@/interface/http/validators";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ modelKey: string }> }
): Promise<Response> {
  return handleApiRequest(request, async () => {
    const container = getContainer();
    const { modelKey } = await context.params;
    const payload = await parseStudioUpdateModelDefinitionPayload(request);
    const updated = await container.updateNotionModelDefinitionUseCase.execute({
      modelKey,
      ...payload,
    });
    return jsonSuccess(updated);
  });
}
