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
          generatedAt: "2026-01-01T00:00:00.000Z",
          dataSourceId: "ds-resume",
        },
        sections: [
          {
            key: "experience",
            title: "Experience",
            order: 20,
            tags: ["Backend"],
            groups: [
              {
                key: "acme",
                title: "Acme",
                order: 1,
                entries: [
                  {
                    key: "entry-1",
                    title: "Platform Engineer",
                    period: {
                      label: "Jan 2024 - Present",
                      start: "2024-01-01",
                      end: null,
                    },
                    summary: {
                      text: "Built systems",
                      bullets: ["Built systems"],
                    },
                    tags: ["Backend"],
                    media: {
                      logoUrl: null,
                    },
                    sort: {
                      itemOrder: 1,
                      periodStart: "2024-01-01",
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    render(await ResumePage());

    expect(screen.getByText("Experience")).toBeInTheDocument();
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("Platform Engineer")).toBeInTheDocument();
    expect(screen.getByText("Jan 2024 - Present")).toBeInTheDocument();
  });

  it("renders empty state when sections are empty", async () => {
    serverApiRequest.mockResolvedValue({
      ok: true,
      data: {
        meta: {
          generatedAt: "2026-01-01T00:00:00.000Z",
          dataSourceId: "ds-resume",
        },
        sections: [],
      },
    });

    render(await ResumePage());
    expect(screen.getByText("Resume Data Source 目前沒有可顯示的資料。")).toBeInTheDocument();
  });
});

