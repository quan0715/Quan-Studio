import type { ResumeGroup, ResumeSection } from "@/presentation/types/resume";

export function normalizePeriod(value?: string): string {
  if (!value) {
    return "";
  }

  if (value.toLowerCase() === "next") {
    return "Incoming";
  }

  return value;
}

export function findSection(
  sections: ResumeSection[],
  id: string,
  title: string
): ResumeSection | undefined {
  const idLower = id.toLowerCase();
  const titleLower = title.toLowerCase();
  return sections.find(
    (section) => section.key.toLowerCase() === idLower || section.title.toLowerCase() === titleLower
  );
}

export function findGroup(
  section: ResumeSection | undefined,
  id: string,
  title: string
): ResumeGroup | undefined {
  if (!section) {
    return undefined;
  }

  const idLower = id.toLowerCase();
  const titleLower = title.toLowerCase();
  return section.groups.find(
    (group) => group.key.toLowerCase() === idLower || group.title.toLowerCase() === titleLower
  );
}

export function findGroupInSections(
  sections: ResumeSection[],
  matchers: Array<{ id: string; title: string }>
): ResumeGroup | undefined {
  for (const section of sections) {
    for (const matcher of matchers) {
      const match = findGroup(section, matcher.id, matcher.title);
      if (match) {
        return match;
      }
    }
  }

  return undefined;
}
