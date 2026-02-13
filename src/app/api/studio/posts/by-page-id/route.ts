import { AppError } from "@/application/errors";
import { jsonSuccess } from "@/interface/http/api-response";
import { getContainer } from "@/interface/container";
import { toPostDetailDto } from "@/interface/dto/post-dto";
import { handleApiRequest } from "@/interface/http/handler";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleApiRequest(request, async () => {
    const pageId = new URL(request.url).searchParams.get("pageId")?.trim() ?? "";

    if (!pageId) {
      throw new AppError("VALIDATION_ERROR", "pageId is required");
    }

    const post = await getContainer().getStudioPostByNotionPageIdUseCase.execute(pageId);
    return jsonSuccess(toPostDetailDto(post));
  });
}
