import { describe, expect, it } from "vitest";
import { toPostDetailDto } from "@/interface/dto/post-dto";
import type { Post } from "@/domain/post/post";

function createPost(overrides?: Partial<Post>): Post {
  return {
    id: "post-1",
    title: "Hello",
    slug: "hello",
    excerpt: "excerpt",
    tags: ["tag"],
    status: "draft",
    contentJson: {
      _notion: {
        pageIcon: {
          emoji: "📝",
          url: null,
        },
        pageTimestamps: {
          createdTime: "2026-02-01T00:00:00.000Z",
          lastEditedTime: "2026-02-02T00:00:00.000Z",
        },
      },
    },
    coverUrl: null,
    publishedAt: null,
    notionPageId: "page-1",
    notionLastEditedAt: new Date("2026-02-02T00:00:00.000Z"),
    syncedAt: new Date("2026-02-03T00:00:00.000Z"),
    syncError: null,
    createdAt: new Date("2026-02-01T00:00:00.000Z"),
    updatedAt: new Date("2026-02-03T00:00:00.000Z"),
    ...overrides,
  };
}

describe("post dto", () => {
  it("includes notion built-in page timestamps", () => {
    const dto = toPostDetailDto(createPost());

    expect(dto.notionPageCreatedTime).toBe("2026-02-01T00:00:00.000Z");
    expect(dto.notionPageLastEditedTime).toBe("2026-02-02T00:00:00.000Z");
    expect(dto.pageIconEmoji).toBe("📝");
  });

  it("falls back to null when timestamps are missing", () => {
    const dto = toPostDetailDto(
      createPost({
        contentJson: {},
      })
    );

    expect(dto.notionPageCreatedTime).toBeNull();
    expect(dto.notionPageLastEditedTime).toBeNull();
  });
});
