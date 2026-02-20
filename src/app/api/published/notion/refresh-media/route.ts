import { POST as publicPost } from "@/app/api/public/notion/refresh-media/route";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return publicPost(request);
}
