import { NextResponse } from "next/server";

export function jsonSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(
    {
      ok: true,
      data,
    },
    { status }
  );
}

export function jsonError(code: string, message: string, status: number): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
      },
    },
    { status }
  );
}
