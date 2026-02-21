import { AppError } from "@/application/errors";
import { jsonSuccess } from "@/interface/http/api-response";
import { getContainer } from "@/interface/container";
import { handleApiRequest } from "@/interface/http/handler";
import { parseManualEnqueuePayload } from "@/interface/http/validators";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return handleApiRequest(request, async () => {
    const payload = await parseManualEnqueuePayload(request);
    const post = await getContainer().getStudioPostByNotionPageIdUseCase.execute(payload.pageId);

    if (post.status !== "published") {
      throw new AppError("POST_NOT_FOUND", "post not found");
    }

    const result = await getContainer().processNextNotionSyncJobUseCase.executePage(payload.pageId);
    if (!result.ok) {
      throw new AppError("NOTION_API_ERROR", result.error || "failed to refresh notion media");
    }

    return jsonSuccess({
      refreshed: true,
      pageId: result.pageId,
      entityId: result.entityId,
    });
  });
}
