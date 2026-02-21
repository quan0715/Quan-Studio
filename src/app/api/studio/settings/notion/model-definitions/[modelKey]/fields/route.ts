import { jsonSuccess } from "@/interface/http/api-response";
import { getContainer } from "@/interface/container";
import { handleApiRequest } from "@/interface/http/handler";
import { parseStudioModelFieldPayload } from "@/interface/http/validators";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ modelKey: string }> }
): Promise<Response> {
  return handleApiRequest(request, async () => {
    const container = getContainer();
    const { modelKey } = await context.params;
    const payload = await parseStudioModelFieldPayload(request);
    await container.addNotionModelFieldUseCase.execute({
      modelKey,
      ...payload,
    });
    const result = await container.listNotionModelDefinitionsUseCase.execute();
    return jsonSuccess(result);
  });
}
