import { AppError } from "@/application/errors";

type JsonObject = Record<string, unknown>;

type WebhookPayload = {
  pageId: string;
  dedupeKey: string;
  payload: JsonObject;
};

type ManualEnqueuePayload = {
  pageId: string;
  dedupeKey: string;
};

type StudioNotionSettingsPayload = {
  blogDataSourceId: string;
  resumeDataSourceId: string;
};

type StudioLoginPayload = {
  username: string;
  password: string;
};

type StudioNotionSchemaMappingPayload = {
  source: "blog" | "resume";
  mappings: Record<string, string | null>;
};

export async function parseNotionWebhookButtonPayload(
  request: Request,
  sharedSecret: string
): Promise<WebhookPayload> {
  if (!sharedSecret.trim()) {
    throw new AppError("VALIDATION_ERROR", "NOTION_WEBHOOK_SHARED_SECRET is not configured");
  }

  const incomingSecret =
    request.headers.get("x-notion-webhook-secret") ??
    request.headers.get("x-webhook-secret") ??
    parseBearerToken(request.headers.get("authorization"));

  if (!incomingSecret || incomingSecret !== sharedSecret) {
    throw new AppError("UNAUTHORIZED_WEBHOOK", "invalid webhook secret");
  }

  const body = await parseJsonBody(request);

  if (!isPlainObject(body)) {
    throw new AppError("VALIDATION_ERROR", "request body must be an object");
  }

  const pageId = extractPageId(body);
  if (!pageId) {
    throw new AppError("VALIDATION_ERROR", "pageId is required");
  }

  const dedupeKey = extractWebhookDedupeKey(body, pageId);

  return {
    pageId,
    dedupeKey,
    payload: body,
  };
}

export async function parseManualEnqueuePayload(request: Request): Promise<ManualEnqueuePayload> {
  const body = await parseJsonBody(request);

  if (!isPlainObject(body)) {
    throw new AppError("VALIDATION_ERROR", "request body must be an object");
  }

  const pageId = extractPageId(body);
  if (!pageId) {
    throw new AppError("VALIDATION_ERROR", "pageId is required");
  }

  const dedupeKey = typeof body.dedupeKey === "string" && body.dedupeKey.trim().length > 0
    ? body.dedupeKey.trim()
    : `manual:${pageId}:${Date.now()}:${crypto.randomUUID()}`;

  return {
    pageId,
    dedupeKey,
  };
}

export function parseSyncJobsLimit(url: string, defaultLimit = 50): number {
  const params = new URL(url).searchParams;
  const raw = params.get("limit");

  if (!raw) {
    return defaultLimit;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 200) {
    throw new AppError("VALIDATION_ERROR", "limit must be an integer between 1 and 200");
  }

  return parsed;
}

export async function parseStudioNotionSettingsPayload(
  request: Request
): Promise<StudioNotionSettingsPayload> {
  const body = await parseJsonBody(request);

  if (!isPlainObject(body)) {
    throw new AppError("VALIDATION_ERROR", "request body must be an object");
  }

  const blogDataSourceId = readRequiredTrimmedString(body, "blogDataSourceId");
  const resumeDataSourceId = readRequiredTrimmedString(body, "resumeDataSourceId");

  return {
    blogDataSourceId,
    resumeDataSourceId,
  };
}

export async function parseStudioLoginPayload(request: Request): Promise<StudioLoginPayload> {
  const body = await parseJsonBody(request);

  if (!isPlainObject(body)) {
    throw new AppError("VALIDATION_ERROR", "request body must be an object");
  }

  return {
    username: readRequiredTrimmedString(body, "username"),
    password: readRequiredTrimmedString(body, "password"),
  };
}

export async function parseStudioNotionSchemaMappingPayload(
  request: Request
): Promise<StudioNotionSchemaMappingPayload> {
  const body = await parseJsonBody(request);

  if (!isPlainObject(body)) {
    throw new AppError("VALIDATION_ERROR", "request body must be an object");
  }

  const sourceRaw = body.source;
  if (sourceRaw !== "blog" && sourceRaw !== "resume") {
    throw new AppError("VALIDATION_ERROR", "source must be blog or resume");
  }

  const mappingsRaw = body.mappings;
  if (!isPlainObject(mappingsRaw)) {
    throw new AppError("VALIDATION_ERROR", "mappings must be an object");
  }

  const mappings: Record<string, string | null> = {};
  for (const [appField, value] of Object.entries(mappingsRaw)) {
    if (typeof appField !== "string" || !appField.trim()) {
      throw new AppError("VALIDATION_ERROR", "invalid appField in mappings");
    }
    if (value !== null && typeof value !== "string") {
      throw new AppError("VALIDATION_ERROR", `mapping value for ${appField} must be string or null`);
    }

    mappings[appField] = value;
  }

  return {
    source: sourceRaw,
    mappings,
  };
}

async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return (await request.json()) as unknown;
  } catch {
    throw new AppError("VALIDATION_ERROR", "invalid JSON body");
  }
}

function parseBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

function extractWebhookDedupeKey(payload: JsonObject, pageId: string): string {
  const eventId =
    readStringAtPath(payload, ["id"]) ??
    readStringAtPath(payload, ["event_id"]) ??
    readStringAtPath(payload, ["event", "id"]) ??
    readStringAtPath(payload, ["trigger", "id"]);

  if (eventId) {
    return `button:${eventId}`;
  }

  return `button:${pageId}:${Date.now()}:${crypto.randomUUID()}`;
}

function extractPageId(payload: JsonObject): string | null {
  const direct =
    readStringAtPath(payload, ["pageId"]) ??
    readStringAtPath(payload, ["page_id"]) ??
    readStringAtPath(payload, ["data", "pageId"]) ??
    readStringAtPath(payload, ["data", "page_id"]) ??
    readStringAtPath(payload, ["entity", "id"]) ??
    readStringAtPath(payload, ["page", "id"]) ??
    readStringAtPath(payload, ["data", "page", "id"]);

  if (!direct) {
    return null;
  }

  const normalized = direct.trim();
  return normalized.length > 0 ? normalized : null;
}

function readStringAtPath(value: unknown, path: string[]): string | null {
  let current: unknown = value;

  for (const key of path) {
    if (!isPlainObject(current)) {
      return null;
    }
    current = current[key];
  }

  if (typeof current !== "string") {
    return null;
  }

  const trimmed = current.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readRequiredTrimmedString(payload: JsonObject, key: string): string {
  const value = payload[key];
  if (typeof value !== "string") {
    throw new AppError("VALIDATION_ERROR", `${key} is required`);
  }

  const normalized = value.trim();
  if (!normalized) {
    throw new AppError("VALIDATION_ERROR", `${key} is required`);
  }

  return normalized;
}

function isPlainObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
