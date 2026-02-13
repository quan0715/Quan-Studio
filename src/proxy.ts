import { NextRequest, NextResponse } from "next/server";
import {
  getStudioSessionCookieName,
  isStudioAuthEnabled,
  verifyStudioSessionToken,
} from "@/infrastructure/auth/studio-auth";

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const isStudioPage = pathname.startsWith("/studio");
  const isStudioApi = pathname.startsWith("/api/studio");
  const isProcessNextApi = pathname === "/api/studio/sync-jobs/process-next";

  if (!isStudioPage && !isStudioApi) {
    return NextResponse.next();
  }

  if (isProcessNextApi && isInternalWorkerRequest(request)) {
    return NextResponse.next();
  }

  if (!isStudioAuthEnabled()) {
    return NextResponse.next();
  }

  const isLoginPage = pathname === "/studio/login";
  const isLoginApi = pathname === "/api/studio/auth/login";
  const isLogoutApi = pathname === "/api/studio/auth/logout";
  const token = request.cookies.get(getStudioSessionCookieName())?.value ?? "";
  const isAuthenticated = await verifyStudioSessionToken(token);

  if (isLoginPage && isAuthenticated) {
    return NextResponse.redirect(new URL("/studio/posts", request.url));
  }

  if (isLoginPage || isLoginApi || isLogoutApi) {
    return NextResponse.next();
  }

  if (isAuthenticated) {
    return NextResponse.next();
  }

  if (isStudioApi) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Studio authentication required",
        },
      },
      { status: 401 }
    );
  }

  const loginUrl = new URL("/studio/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

function isInternalWorkerRequest(request: NextRequest): boolean {
  const configuredSecret = (process.env.STUDIO_SESSION_SECRET ?? "").trim();
  if (!configuredSecret) {
    return false;
  }

  const incomingSecret = (request.headers.get("x-studio-internal-token") ?? "").trim();
  return incomingSecret.length > 0 && incomingSecret === configuredSecret;
}

export const config = {
  matcher: ["/studio/:path*", "/api/studio/:path*"],
};
