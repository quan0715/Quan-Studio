import { jsonSuccess } from "@/interface/http/api-response";
import { handleApiRequest } from "@/interface/http/handler";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleApiRequest(request, async () => {
    return jsonSuccess({ status: "ok" });
  });
}
