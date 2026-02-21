import type { ErrorCode } from "@/application/errors";

export function statusByErrorCode(code: ErrorCode): number {
  switch (code) {
    case "VALIDATION_ERROR":
      return 422;
    case "UNAUTHORIZED_WEBHOOK":
      return 401;
    case "POST_NOT_FOUND":
      return 404;
    case "SYNC_JOB_NOT_FOUND":
      return 404;
    case "MEDIA_LINK_NOT_FOUND":
      return 404;
    case "NOTION_API_ERROR":
      return 502;
    case "INTERNAL_ERROR":
      return 500;
    default:
      return 500;
  }
}
