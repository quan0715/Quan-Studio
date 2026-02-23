import { describe, expect, it } from "vitest";
import { toResumeSections } from "@/presentation/lib/transform-resume-model-rows";
import type { TypedFieldValue } from "@/presentation/types/notion-model-query";

function buildRow(visibility: string | null): Record<string, TypedFieldValue> {
  return {
    __pageId: "row-1",
    "resume.name": "Entry",
    "resume.section": "Work Experience",
    "resume.group": "Acme",
    "resume.summary": "Summary",
    "resume.visibility": visibility,
  };
}

describe("toResumeSections visibility target filtering", () => {
  it("hides private items for both targets", () => {
    const rows = [buildRow("private")];

    expect(toResumeSections(rows, { target: "website" })).toHaveLength(0);
    expect(toResumeSections(rows, { target: "pdf" })).toHaveLength(0);
  });

  it("hides website-only item from pdf target", () => {
    const rows = [buildRow("website-only")];

    expect(toResumeSections(rows, { target: "website" })).toHaveLength(1);
    expect(toResumeSections(rows, { target: "pdf" })).toHaveLength(0);
  });

  it("hides pdf-only item from website target", () => {
    const rows = [buildRow("pdf-only")];

    expect(toResumeSections(rows, { target: "website" })).toHaveLength(0);
    expect(toResumeSections(rows, { target: "pdf" })).toHaveLength(1);
  });

  it("keeps public item visible for both targets", () => {
    const rows = [buildRow("public")];

    expect(toResumeSections(rows, { target: "website" })).toHaveLength(1);
    expect(toResumeSections(rows, { target: "pdf" })).toHaveLength(1);
  });

  it("uses event period for awards by default", () => {
    const rows: Array<Record<string, TypedFieldValue>> = [
      {
        __pageId: "row-award",
        "resume.name": "Award Entry",
        "resume.section": "Awards",
        "resume.group": "Award Group",
        "resume.summary": "Summary",
        "resume.date": { start: "2025-07-01", end: null },
      },
    ];

    const sections = toResumeSections(rows, { target: "pdf" });
    const entry = sections[0]?.groups[0]?.entries[0];
    expect(entry?.period.kind).toBe("event");
    expect(entry?.period.label).toBe("Jul 2025");
  });

  it("uses experience period for work experience by default", () => {
    const rows: Array<Record<string, TypedFieldValue>> = [
      {
        __pageId: "row-exp",
        "resume.name": "Experience Entry",
        "resume.section": "Work Experience",
        "resume.group": "Company",
        "resume.summary": "Summary",
        "resume.date": { start: "2024-01-01", end: null },
      },
    ];

    const sections = toResumeSections(rows, { target: "pdf" });
    const entry = sections[0]?.groups[0]?.entries[0];
    expect(entry?.period.kind).toBe("experience");
    expect(entry?.period.label).toBe("Jan 2024 - Present");
  });
});
