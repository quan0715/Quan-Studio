import { NextResponse } from "next/server";
import {
  createStudioSessionToken,
  getStudioSessionCookieName,
  getStudioSessionMaxAgeSeconds,
  validateStudioCredentials,
} from "@/infrastructure/auth/studio-auth";
import { jsonSuccess } from "@/interface/http/api-response";
import { handleApiRequest } from "@/interface/http/handler";
import { parseStudioLoginPayload } from "@/interface/http/validators";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return handleApiRequest(request, async () => {
    const { username, password } = await parseStudioLoginPayload(request);

    if (!(await validateStudioCredentials(username, password))) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "UNAUTHORIZED",
            message: "invalid username or password",
          },
        },
        { status: 401 }
      );
    }

    const token = await createStudioSessionToken(username);
    const nextResponse = jsonSuccess({ ok: true });

    nextResponse.cookies.set(getStudioSessionCookieName(), token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: getStudioSessionMaxAgeSeconds(),
    });

    return nextResponse;
  });
}
