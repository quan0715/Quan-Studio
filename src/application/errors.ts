export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED_WEBHOOK"
  | "POST_NOT_FOUND"
  | "SYNC_JOB_NOT_FOUND"
  | "NOTION_API_ERROR"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export function asAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (isErrorLike(error)) {
    return new AppError(error.code, error.message);
  }

  return new AppError("INTERNAL_ERROR", "Internal server error");
}

function isErrorLike(
  value: unknown
): value is { code: ErrorCode; message: string } {
  if (!value || typeof value !== "object") {
    return false;
  }

  const code = (value as { code?: unknown }).code;
  const message = (value as { message?: unknown }).message;

  if (typeof message !== "string") {
    return false;
  }

  return (
    code === "VALIDATION_ERROR" ||
    code === "UNAUTHORIZED_WEBHOOK" ||
    code === "POST_NOT_FOUND" ||
    code === "SYNC_JOB_NOT_FOUND" ||
    code === "NOTION_API_ERROR" ||
    code === "INTERNAL_ERROR"
  );
}
