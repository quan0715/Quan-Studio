import { GET as publicGet } from "@/app/api/public/resume/route";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return publicGet(request);
}
