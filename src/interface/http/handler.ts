import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { asAppError } from "@/application/errors";
import { jsonError } from "@/interface/http/api-response";
import { statusByErrorCode } from "@/interface/http/error-mapper";

type RequestContext = {
  requestId: string;
};

export async function handleApiRequest(
  request: Request,
  handler: (context: RequestContext) => Promise<Response>
): Promise<Response> {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const startedAt = Date.now();
  const pathname = new URL(request.url).pathname;

  let response: Response;
  let status = 500;
  let errorCode: string | undefined;

  try {
    response = await handler({ requestId });
    status = response.status;
  } catch (error) {
    const appError = asAppError(error);
    errorCode = appError.code;
    status = statusByErrorCode(appError.code);
    response = jsonError(appError.code, appError.message, status);
  }

  const latencyMs = Date.now() - startedAt;
  console.info(
    JSON.stringify({
      level: "info",
      requestId,
      path: pathname,
      status,
      latencyMs,
    })
  );

  if (status >= 500) {
    console.error(
      JSON.stringify({
        level: "error",
        requestId,
        path: pathname,
        errorCode: errorCode ?? "INTERNAL_ERROR",
      })
    );
  }

  const nextResponse = response instanceof NextResponse ? response : new NextResponse(response.body, response);
  nextResponse.headers.set("x-request-id", requestId);

  return nextResponse;
}
