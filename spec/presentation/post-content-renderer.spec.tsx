import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PostContentRenderer } from "@/presentation/features/post-renderer/post-content-renderer";

vi.mock("@/presentation/features/notion-sync/resilient-notion-image", () => ({
  ResilientNotionImage: ({
    src,
    alt,
  }: {
    src: string;
    alt: string;
  }) => <span role="img" aria-label={alt} data-src={src} />,
}));

function createCalloutDocument(icon?: unknown): Record<string, unknown> {
  return {
    results: [
      {
        id: "callout-1",
        type: "callout",
        callout: {
          rich_text: [
            {
              type: "text",
              plain_text: "Callout content",
              text: { content: "Callout content" },
            },
          ],
          ...(icon !== undefined ? { icon } : {}),
        },
      },
    ],
  };
}

describe("PostContentRenderer callout icon", () => {
  it("does not render icon when callout has no icon", () => {
    render(<PostContentRenderer document={createCalloutDocument()} />);

    expect(screen.getByText("Callout content")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Callout icon" })).not.toBeInTheDocument();
    expect(screen.queryByText(/^i$/)).not.toBeInTheDocument();
  });

  it("renders emoji icon when provided", () => {
    render(
      <PostContentRenderer
        document={createCalloutDocument({
          type: "emoji",
          emoji: "💡",
        })}
      />
    );

    expect(screen.getByText("💡")).toBeInTheDocument();
  });

  it("renders file icon when provided", () => {
    render(
      <PostContentRenderer
        document={createCalloutDocument({
          type: "file",
          file: {
            url: "https://example.com/callout-icon.png",
          },
        })}
      />
    );

    expect(screen.getByRole("img", { name: "Callout icon" })).toHaveAttribute(
      "data-src",
      "https://example.com/callout-icon.png"
    );
  });
});
