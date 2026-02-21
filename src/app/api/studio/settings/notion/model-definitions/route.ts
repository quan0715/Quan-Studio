import { jsonSuccess } from "@/interface/http/api-response";
import { getContainer } from "@/interface/container";
import { handleApiRequest } from "@/interface/http/handler";
import { parseStudioCreateModelDefinitionPayload } from "@/interface/http/validators";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleApiRequest(request, async () => {
    const container = getContainer();
    const result = await container.listNotionModelDefinitionsUseCase.execute();
    return jsonSuccess(result);
  });
}

export async function POST(request: Request): Promise<Response> {
  return handleApiRequest(request, async () => {
    const container = getContainer();
    const payload = await parseStudioCreateModelDefinitionPayload(request);
    const created = await container.createNotionModelDefinitionUseCase.execute(payload);
    return jsonSuccess(created, 201);
  });
}
