import { jsonSuccess } from "@/interface/http/api-response";
import { getContainer } from "@/interface/container";
import { handleApiRequest } from "@/interface/http/handler";
import { parseStudioMigratePayload } from "@/interface/http/validators";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return handleApiRequest(request, async () => {
    const container = getContainer();
    const payload = await parseStudioMigratePayload(request);
    const result = await container.migrateNotionSchemaUseCase.execute(payload);
    return jsonSuccess(result);
  });
}
