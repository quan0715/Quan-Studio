import { describe, expect, it } from "vitest";
import { statusByErrorCode } from "@/interface/http/error-mapper";
import type { ErrorCode } from "@/application/errors";

describe("statusByErrorCode", () => {
  it.each<[ErrorCode, number]>([
    ["VALIDATION_ERROR", 422],
    ["UNAUTHORIZED_WEBHOOK", 401],
    ["POST_NOT_FOUND", 404],
    ["SYNC_JOB_NOT_FOUND", 404],
    ["MEDIA_LINK_NOT_FOUND", 404],
    ["NOTION_API_ERROR", 502],
    ["INTERNAL_ERROR", 500],
  ])("maps %s to HTTP %i", (code, expected) => {
    expect(statusByErrorCode(code)).toBe(expected);
  });
});
