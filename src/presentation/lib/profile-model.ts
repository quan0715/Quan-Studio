import type { TypedFieldValue } from "@/presentation/types/notion-model-query";

export type ProfileView = {
  fullName: string | null;
  headline: string | null;
  summary: string | null;
  location: string | null;
  email: string | null;
  phone: string | null;
  itemOrder: number | null;
};

export function pickProfileFromRows(
  rows: Array<Record<string, TypedFieldValue>>
): ProfileView | null {
  const profiles = rows
    .map((row) => toProfileView(row))
    .filter((profile) => hasProfileContent(profile));

  if (profiles.length === 0) {
    return null;
  }

  profiles.sort((a, b) => compareOrder(a.itemOrder, b.itemOrder));
  return profiles[0] ?? null;
}

function toProfileView(row: Record<string, TypedFieldValue>): ProfileView {
  return {
    fullName: readStringBySuffixes(row, ["fullName", "name"]),
    headline: readStringBySuffixes(row, ["headline", "title", "role"]),
    summary: readStringBySuffixes(row, ["summary", "bio", "about"]),
    location: readStringBySuffixes(row, ["location"]),
    email: readStringBySuffixes(row, ["email"]),
    phone: readStringBySuffixes(row, ["phone", "mobile", "tel"]),
    itemOrder: readNumberBySuffixes(row, ["itemOrder", "order", "sort"]),
  };
}

function hasProfileContent(profile: ProfileView): boolean {
  return Boolean(
    profile.fullName ||
      profile.headline ||
      profile.summary ||
      profile.location ||
      profile.email ||
      profile.phone
  );
}

function compareOrder(a: number | null, b: number | null): number {
  if (a !== null && b !== null) return a - b;
  if (a !== null) return -1;
  if (b !== null) return 1;
  return 0;
}

function readStringBySuffixes(
  row: Record<string, TypedFieldValue>,
  suffixes: string[]
): string | null {
  for (const suffix of suffixes) {
    for (const [key, value] of Object.entries(row)) {
      if (key.endsWith(`.${suffix}`) && typeof value === "string" && value.trim().length > 0) {
        return value.trim();
      }
    }
  }
  return null;
}

function readNumberBySuffixes(
  row: Record<string, TypedFieldValue>,
  suffixes: string[]
): number | null {
  for (const suffix of suffixes) {
    for (const [key, value] of Object.entries(row)) {
      if (key.endsWith(`.${suffix}`) && typeof value === "number" && Number.isFinite(value)) {
        return value;
      }
    }
  }
  return null;
}
