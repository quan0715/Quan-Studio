import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ResumePage from "@/app/(site)/resume/page";

const serverApiRequest = vi.fn();

vi.mock("@/presentation/lib/server-api-client", () => ({
  serverApiRequest: (...args: unknown[]) => serverApiRequest(...args),
}));

describe("ResumePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders grouped entries from resume response", async () => {
    serverApiRequest.mockResolvedValue({
      ok: true,
      data: {
        meta: {
          modelKey: "resume",
          generatedAt: "2026-01-01T00:00:00.000Z",
          dataSourceId: "ds-resume",
          schemaVersion: 1,
        },
        rows: [
          {
            __pageId: "entry-1",
            "resume.name": "Platform Engineer",
            "resume.section": "Experience",
            "resume.group": "Acme",
            "resume.location": "Taipei, Taiwan",
            "resume.summary": "Built systems",
            "resume.date": { start: "2024-01-01", end: null },
            "resume.tags": ["Backend"],
            "resume.sectionOrder": 20,
            "resume.groupOrder": 1,
            "resume.itemOrder": 1,
            "resume.visibility": "public",
            "resume.logo": null,
          },
        ],
      },
    });

    render(await ResumePage());

    expect(screen.getByText("Experience")).toBeInTheDocument();
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("Platform Engineer")).toBeInTheDocument();
    expect(screen.getByText("Jan 2024 - Present")).toBeInTheDocument();
    expect(screen.getByText("Taipei, Taiwan")).toBeInTheDocument();
  });

  it("renders empty state when sections are empty", async () => {
    serverApiRequest.mockResolvedValue({
      ok: true,
      data: {
        meta: {
          modelKey: "resume",
          generatedAt: "2026-01-01T00:00:00.000Z",
          dataSourceId: "ds-resume",
          schemaVersion: 1,
        },
        rows: [],
      },
    });

    render(await ResumePage());
    expect(screen.getByText("Resume Data Source 目前沒有可顯示的資料。")).toBeInTheDocument();
  });
});
