export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function resolveUniqueSlug(
  baseSlug: string,
  exists: (slug: string) => Promise<boolean>
): Promise<string> {
  if (!(await exists(baseSlug))) {
    return baseSlug;
  }

  let suffix = 2;
  while (true) {
    const candidate = `${baseSlug}-${suffix}`;
    if (!(await exists(candidate))) {
      return candidate;
    }

    suffix += 1;
  }
}
