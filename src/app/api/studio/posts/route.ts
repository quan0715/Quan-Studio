import { jsonSuccess } from "@/interface/http/api-response";
import { getContainer } from "@/interface/container";
import { toPostListItemDto } from "@/interface/dto/post-dto";
import { handleApiRequest } from "@/interface/http/handler";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handleApiRequest(request, async () => {
    const posts = await getContainer().listStudioPostsUseCase.execute();
    return jsonSuccess(posts.map(toPostListItemDto));
  });
}
