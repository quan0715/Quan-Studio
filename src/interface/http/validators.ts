import { AppError } from "@/application/errors";
import { isPlainObject } from "@/shared/utils/type-guards";

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

type StudioLoginPayload = {
  username: string;
  password: string;
};

type StudioNotionSchemaMappingPayload = {
  source: string;
  mappings: Record<string, string | null>;
};

type StudioNotionModelSelectSourcePayload = {
  template: string;
  dataSourceId: string;
};

type StudioCreateModelDefinitionPayload = {
  modelKey: string;
  label: string;
  defaultDisplayName: string;
  schemaSource?: string;
  projectionKind?: "flat_list";
  projectionConfigJson?: Record<string, unknown>;
};

type StudioUpdateModelDefinitionPayload = {
  label?: string;
  defaultDisplayName?: string;
  schemaSource?: string;
  projectionKind?: "flat_list";
  projectionConfigJson?: Record<string, unknown>;
  isActive?: boolean;
};

type StudioModelFieldPayload = {
  fieldKey: string;
  appField: string;
  expectedType: string;
  required?: boolean;
  description?: string;
  defaultNotionField?: string | null;
  builtinField?: string | null;
  sortOrder?: number;
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

  const source = parseSchemaSource(body.source);

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
    source,
    mappings,
  };
}

export async function parseStudioNotionModelSelectSourcePayload(
  request: Request
): Promise<StudioNotionModelSelectSourcePayload> {
  const body = await parseJsonBody(request);

  if (!isPlainObject(body)) {
    throw new AppError("VALIDATION_ERROR", "request body must be an object");
  }

  const template = parseModelTemplate(body.template);
  const dataSourceId = readRequiredTrimmedString(body, "dataSourceId");

  return {
    template,
    dataSourceId,
  };
}

export async function parseStudioProvisionPayload(
  request: Request
): Promise<{ modelId: string; displayName?: string }> {
  const body = await parseJsonBody(request);

  if (!isPlainObject(body)) {
    throw new AppError("VALIDATION_ERROR", "request body must be an object");
  }

  const modelId = parseModelTemplate(body.modelId);
  const displayName =
    typeof body.displayName === "string" && body.displayName.trim().length > 0
      ? body.displayName.trim()
      : undefined;

  return { modelId, displayName };
}

export async function parseStudioMigratePayload(
  request: Request
): Promise<{ modelId: string; allowDelete: boolean; fieldName?: string }> {
  const body = await parseJsonBody(request);

  if (!isPlainObject(body)) {
    throw new AppError("VALIDATION_ERROR", "request body must be an object");
  }

  const modelId = parseModelTemplate(body.modelId);
  const allowDelete = body.allowDelete === true;
  const fieldName =
    typeof body.fieldName === "string" && body.fieldName.trim().length > 0
      ? body.fieldName.trim()
      : undefined;

  return { modelId, allowDelete, fieldName };
}

export async function parseStudioCreateModelDefinitionPayload(
  request: Request
): Promise<StudioCreateModelDefinitionPayload> {
  const body = await parseJsonBody(request);
  if (!isPlainObject(body)) {
    throw new AppError("VALIDATION_ERROR", "request body must be an object");
  }
  return {
    modelKey: readRequiredTrimmedString(body, "modelKey"),
    label: readRequiredTrimmedString(body, "label"),
    defaultDisplayName: readRequiredTrimmedString(body, "defaultDisplayName"),
    schemaSource: readOptionalNullableTrimmedString(body, "schemaSource") ?? undefined,
    projectionKind:
      body.projectionKind === "flat_list" || body.projectionKind === undefined
        ? body.projectionKind
        : (() => {
            throw new AppError("VALIDATION_ERROR", "projectionKind must be flat_list");
          })(),
    projectionConfigJson: isPlainObject(body.projectionConfigJson)
      ? body.projectionConfigJson
      : undefined,
  };
}

export async function parseStudioUpdateModelDefinitionPayload(
  request: Request
): Promise<StudioUpdateModelDefinitionPayload> {
  const body = await parseJsonBody(request);
  if (!isPlainObject(body)) {
    throw new AppError("VALIDATION_ERROR", "request body must be an object");
  }
  return {
    ...(Object.prototype.hasOwnProperty.call(body, "label")
      ? { label: readRequiredTrimmedString(body, "label") }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(body, "defaultDisplayName")
      ? { defaultDisplayName: readRequiredTrimmedString(body, "defaultDisplayName") }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(body, "schemaSource")
      ? { schemaSource: readRequiredTrimmedString(body, "schemaSource") }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(body, "projectionKind")
      ? {
          projectionKind:
            body.projectionKind === "flat_list"
              ? "flat_list"
              : (() => {
                  throw new AppError("VALIDATION_ERROR", "projectionKind must be flat_list");
                })(),
        }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(body, "projectionConfigJson")
      ? {
          projectionConfigJson: isPlainObject(body.projectionConfigJson)
            ? body.projectionConfigJson
            : (() => {
                throw new AppError("VALIDATION_ERROR", "projectionConfigJson must be object");
              })(),
        }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(body, "isActive")
      ? { isActive: readRequiredBoolean(body, "isActive") }
      : {}),
  };
}

export async function parseStudioModelFieldPayload(
  request: Request
): Promise<StudioModelFieldPayload> {
  const body = await parseJsonBody(request);
  if (!isPlainObject(body)) {
    throw new AppError("VALIDATION_ERROR", "request body must be an object");
  }
  return {
    fieldKey: readRequiredTrimmedString(body, "fieldKey"),
    appField: readRequiredTrimmedString(body, "appField"),
    expectedType: readRequiredTrimmedString(body, "expectedType"),
    required: Object.prototype.hasOwnProperty.call(body, "required")
      ? readRequiredBoolean(body, "required")
      : undefined,
    description: Object.prototype.hasOwnProperty.call(body, "description")
      ? readOptionalNullableTrimmedString(body, "description") ?? ""
      : undefined,
    defaultNotionField: Object.prototype.hasOwnProperty.call(body, "defaultNotionField")
      ? readOptionalNullableTrimmedString(body, "defaultNotionField")
      : undefined,
    builtinField: Object.prototype.hasOwnProperty.call(body, "builtinField")
      ? readOptionalNullableTrimmedString(body, "builtinField")
      : undefined,
    sortOrder: Object.prototype.hasOwnProperty.call(body, "sortOrder")
      ? readRequiredInteger(body, "sortOrder")
      : undefined,
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

function readOptionalNullableTrimmedString(payload: JsonObject, key: string): string | null {
  const value = payload[key];
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new AppError("VALIDATION_ERROR", `${key} must be a string or null`);
  }

  const normalized = value.trim();
  return normalized || null;
}


function readRequiredBoolean(payload: JsonObject, key: string): boolean {
  const value = payload[key];
  if (typeof value !== "boolean") {
    throw new AppError("VALIDATION_ERROR", `${key} must be a boolean`);
  }

  return value;
}

function readRequiredInteger(payload: JsonObject, key: string): number {
  const value = payload[key];
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new AppError("VALIDATION_ERROR", `${key} must be an integer`);
  }

  return value;
}

function parseModelTemplate(value: unknown): string {
  if (typeof value !== "string") {
    throw new AppError("VALIDATION_ERROR", "template is required");
  }
  const normalized = value.trim();
  if (!normalized) {
    throw new AppError("VALIDATION_ERROR", "template is required");
  }
  return normalized;
}

function parseSchemaSource(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError("VALIDATION_ERROR", "source is required");
  }
  return value.trim();
}
