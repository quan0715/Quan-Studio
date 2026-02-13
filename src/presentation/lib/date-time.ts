function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

const ISO_UTC_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?Z$/;
const ISO_DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function formatIsoToUtcDateTime(value: string | null): string {
  if (!value) {
    return "-";
  }

  const isoUtcMatch = ISO_UTC_DATE_TIME_PATTERN.exec(value);
  if (isoUtcMatch) {
    const [, year, month, day, hour, minute] = isoUtcMatch;
    return `${year}/${month}/${day} ${hour}:${minute} UTC`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getUTCFullYear();
  const month = pad2(date.getUTCMonth() + 1);
  const day = pad2(date.getUTCDate());
  const hour = pad2(date.getUTCHours());
  const minute = pad2(date.getUTCMinutes());

  return `${year}/${month}/${day} ${hour}:${minute} UTC`;
}

export function formatIsoToUtcDate(value: string): string {
  const isoUtcMatch = ISO_UTC_DATE_TIME_PATTERN.exec(value);
  if (isoUtcMatch) {
    const [, year, month, day] = isoUtcMatch;
    return `${year}/${month}/${day}`;
  }

  const dateOnlyMatch = ISO_DATE_ONLY_PATTERN.exec(value);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return `${year}/${month}/${day}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getUTCFullYear();
  const month = pad2(date.getUTCMonth() + 1);
  const day = pad2(date.getUTCDate());

  return `${year}/${month}/${day}`;
}
