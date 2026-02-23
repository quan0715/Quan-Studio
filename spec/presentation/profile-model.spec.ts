import { describe, expect, it } from "vitest";
import { pickProfileFromRows } from "@/presentation/lib/profile-model";
import type { TypedFieldValue } from "@/presentation/types/notion-model-query";

describe("pickProfileFromRows", () => {
  it("returns null when no usable profile fields exist", () => {
    const rows: Array<Record<string, TypedFieldValue>> = [{ "profile.itemOrder": 1 }];
    expect(pickProfileFromRows(rows)).toBeNull();
  });

  it("picks row with smallest itemOrder when multiple rows exist", () => {
    const rows: Array<Record<string, TypedFieldValue>> = [
      {
        "profile.fullName": "Second",
        "profile.headline": "Second Headline",
        "profile.itemOrder": 2,
      },
      {
        "profile.fullName": "First",
        "profile.headline": "First Headline",
        "profile.itemOrder": 1,
      },
    ];

    const profile = pickProfileFromRows(rows);
    expect(profile?.fullName).toBe("First");
    expect(profile?.headline).toBe("First Headline");
  });

  it("supports fallback suffixes like name/title/bio", () => {
    const rows: Array<Record<string, TypedFieldValue>> = [
      {
        "profile.name": "Pai-Kuan Chang",
        "profile.title": "Full-Stack Developer",
        "profile.bio": "Summary",
        "profile.location": "Taiwan",
        "profile.email": "hi@quan.studio",
        "profile.phone": "+886-912-345-678",
      },
    ];

    const profile = pickProfileFromRows(rows);
    expect(profile).toMatchObject({
      fullName: "Pai-Kuan Chang",
      headline: "Full-Stack Developer",
      summary: "Summary",
      location: "Taiwan",
      email: "hi@quan.studio",
      phone: "+886-912-345-678",
    });
  });
});
