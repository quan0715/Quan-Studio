import { getStudioSessionCookieName } from "@/infrastructure/auth/studio-auth";
import { jsonSuccess } from "@/interface/http/api-response";
import { handleApiRequest } from "@/interface/http/handler";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return handleApiRequest(request, async () => {
    const nextResponse = jsonSuccess({ ok: true });

    nextResponse.cookies.set(getStudioSessionCookieName(), "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
    });

    return nextResponse;
  });
}
