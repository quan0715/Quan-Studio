import { jsonSuccess } from "@/interface/http/api-response";
import { getContainer } from "@/interface/container";
import { toPostDetailDto } from "@/interface/dto/post-dto";
import { handleApiRequest } from "@/interface/http/handler";

export const runtime = "nodejs";

type ParamsContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, context: ParamsContext): Promise<Response> {
  return handleApiRequest(request, async () => {
    const { slug } = await context.params;
    const post = await getContainer().getPublicPostBySlugUseCase.execute(slug);
    return jsonSuccess(toPostDetailDto(post));
  });
}
