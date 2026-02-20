import { GET as publicGet } from "@/app/api/public/posts/route";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return publicGet(request);
}
