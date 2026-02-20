import { jsonSuccess } from "@/interface/http/api-response";
import { getContainer } from "@/interface/container";
import { handleApiRequest } from "@/interface/http/handler";

export const runtime = "nodejs";

function parseLimit(url: string, fallback = 200): number {
  const value = new URL(url).searchParams.get("limit");
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(Math.floor(parsed), 500);
}

export async function GET(request: Request): Promise<Response> {
  return handleApiRequest(request, async () => {
    const limit = parseLimit(request.url, 200);
    const resume = await getContainer().listNotionResumeDataSourceUseCase.execute(limit);
    return jsonSuccess(resume);
  });
}
