import { GET as publicGet } from "@/app/api/public/posts/[slug]/route";

export const runtime = "nodejs";

type ParamsContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, context: ParamsContext): Promise<Response> {
  return publicGet(request, context);
}
