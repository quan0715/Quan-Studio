export function extractPropertyText(
  properties: Record<string, unknown>,
  key: string
): string | null {
  const value = properties[key];
  if (!isPlainObject(value)) {
    return null;
  }

  if (Array.isArray(value.title)) {
    return asNonEmpty(richTextToPlain(value.title));
  }

  if (Array.isArray(value.rich_text)) {
    return asNonEmpty(richTextToPlain(value.rich_text));
  }

  if (typeof value.plain_text === "string") {
    return asNonEmpty(value.plain_text);
  }

  return null;
}

export function extractPropertyStatusName(
  properties: Record<string, unknown>,
  key: string
): string | null {
  const value = properties[key];
  if (!isPlainObject(value)) {
    return null;
  }

  const status = isPlainObject(value.status)
    ? value.status
    : isPlainObject(value.select)
      ? value.select
      : null;
  if (!status) {
    return null;
  }

  return typeof status.name === "string" ? asNonEmpty(status.name) : null;
}

export function extractPropertySelectName(
  properties: Record<string, unknown>,
  key: string
): string | null {
  const value = properties[key];
  if (!isPlainObject(value) || !isPlainObject(value.select)) {
    return null;
  }

  return typeof value.select.name === "string" ? asNonEmpty(value.select.name) : null;
}

export function extractPropertyMultiSelectNames(
  properties: Record<string, unknown>,
  keys: string[]
): string[] {
  for (const key of keys) {
    const value = properties[key];
    if (!isPlainObject(value)) {
      continue;
    }

    if (Array.isArray(value.multi_select)) {
      return value.multi_select
        .map((item) => {
          if (!isPlainObject(item)) {
            return "";
          }
          return typeof item.name === "string" ? item.name.trim() : "";
        })
        .filter((name) => name.length > 0);
    }

    if (isPlainObject(value.select) && typeof value.select.name === "string") {
      const name = value.select.name.trim();
      if (name) {
        return [name];
      }
    }
  }

  return [];
}

export function extractPropertyNumber(
  properties: Record<string, unknown>,
  key: string
): number | null {
  const value = properties[key];
  if (!isPlainObject(value) || typeof value.number !== "number") {
    return null;
  }

  return value.number;
}

export function extractPropertyDateRange(
  properties: Record<string, unknown>,
  key: string
): { start: string | null; end: string | null } {
  const value = properties[key];
  if (!isPlainObject(value) || !isPlainObject(value.date)) {
    return { start: null, end: null };
  }

  const start = typeof value.date.start === "string" ? asNonEmpty(value.date.start) : null;
  const end = typeof value.date.end === "string" ? asNonEmpty(value.date.end) : null;

  return { start, end };
}

export function extractNotionFileLikeUrl(value: unknown): string | null {
  if (!isPlainObject(value)) {
    return null;
  }

  if (value.type === "external" && isPlainObject(value.external)) {
    const url = value.external.url;
    return typeof url === "string" ? asNonEmpty(url) : null;
  }

  if (value.type === "file" && isPlainObject(value.file)) {
    const url = value.file.url;
    return typeof url === "string" ? asNonEmpty(url) : null;
  }

  if (value.type === "file_upload" && isPlainObject(value.file_upload)) {
    const url = value.file_upload.url;
    return typeof url === "string" ? asNonEmpty(url) : null;
  }

  if (value.type === "custom_emoji" && isPlainObject(value.custom_emoji)) {
    const url = value.custom_emoji.url;
    return typeof url === "string" ? asNonEmpty(url) : null;
  }

  if (typeof value.url === "string") {
    return asNonEmpty(value.url);
  }

  return null;
}

export function normalizeNotionTimestamp(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const timestamp = Date.parse(trimmed);
  if (Number.isNaN(timestamp)) {
    return trimmed;
  }

  return new Date(timestamp).toISOString();
}

function asNonEmpty(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function richTextToPlain(items: unknown[]): string {
  return items
    .map((item) => {
      if (!isPlainObject(item)) {
        return "";
      }

      const plainText = item.plain_text;
      return typeof plainText === "string" ? plainText : "";
    })
    .join("")
    .trim();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
