import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResumeContentRenderer } from "@/presentation/features/resume/resume-content-renderer";

describe("ResumeContentRenderer", () => {
  it("renders paragraph and list blocks", () => {
    render(
      <ResumeContentRenderer
        blocks={[
          {
            id: "p1",
            type: "paragraph",
            paragraph: {
              rich_text: [{ plain_text: "Summary paragraph" }],
            },
          },
          {
            id: "b1",
            type: "bulleted_list_item",
            bulleted_list_item: {
              rich_text: [{ plain_text: "First item" }],
            },
          },
          {
            id: "b2",
            type: "bulleted_list_item",
            bulleted_list_item: {
              rich_text: [{ plain_text: "Second item" }],
            },
          },
        ]}
      />
    );

    expect(screen.getByText("Summary paragraph")).toBeInTheDocument();
    expect(screen.getByText("First item")).toBeInTheDocument();
    expect(screen.getByText("Second item")).toBeInTheDocument();
  });

  it("renders callout text without showing icon", () => {
    render(
      <ResumeContentRenderer
        blocks={[
          {
            id: "c1",
            type: "callout",
            callout: {
              icon: {
                type: "emoji",
                emoji: "💡",
              },
              rich_text: [{ plain_text: "Callout text" }],
            },
          },
        ]}
      />
    );

    expect(screen.getByText("Callout text")).toBeInTheDocument();
    expect(screen.queryByText("💡")).not.toBeInTheDocument();
  });
});
