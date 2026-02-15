import { jsonSuccess } from "@/interface/http/api-response";
import { getContainer } from "@/interface/container";
import { handleApiRequest } from "@/interface/http/handler";
import { parseStudioNotionSchemaMappingPayload } from "@/interface/http/validators";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleApiRequest(request, async () => {
    const result = await getContainer().getNotionSchemaMappingUseCase.execute();
    return jsonSuccess(result);
  });
}

export async function PATCH(request: Request): Promise<Response> {
  return handleApiRequest(request, async () => {
    const payload = await parseStudioNotionSchemaMappingPayload(request);
    await getContainer().updateNotionSchemaMappingUseCase.execute(payload);
    const result = await getContainer().getNotionSchemaMappingUseCase.execute();
    return jsonSuccess(result);
  });
}
