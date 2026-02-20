import { isPlainObject } from "@/shared/utils/type-guards";

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

export function extractPageIcon(icon: unknown): { emoji: string | null; url: string | null } | null {
  if (!isPlainObject(icon)) {
    return null;
  }

  if (icon.type === "emoji") {
    return {
      emoji: typeof icon.emoji === "string" ? icon.emoji : null,
      url: null,
    };
  }

  if (icon.type === "external" && isPlainObject(icon.external)) {
    return {
      emoji: null,
      url: typeof icon.external.url === "string" ? icon.external.url : null,
    };
  }

  if (icon.type === "file" && isPlainObject(icon.file)) {
    return {
      emoji: null,
      url: typeof icon.file.url === "string" ? icon.file.url : null,
    };
  }

  if (icon.type === "custom_emoji" && isPlainObject(icon.custom_emoji)) {
    return {
      emoji: null,
      url: typeof icon.custom_emoji.url === "string" ? icon.custom_emoji.url : null,
    };
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

export function optionalText(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNonEmpty(value: string): string | null {
  return optionalText(value);
}

export function richTextToPlain(items: unknown[]): string {
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
