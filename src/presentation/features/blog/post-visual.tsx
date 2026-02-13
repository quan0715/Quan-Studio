import Image from "next/image";
import { ResilientNotionImage } from "@/presentation/features/notion-sync/resilient-notion-image";
import { cn } from "@/presentation/lib/utils";

export type PostVisualMeta = {
  title: string;
  notionPageId?: string | null;
  coverUrl: string | null;
  pageIconEmoji: string | null;
  pageIconUrl: string | null;
};

type PostIconProps = {
  post: PostVisualMeta;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function PostIcon({ post, size = "md", className }: PostIconProps) {
  const sizeMap = {
    sm: "h-7 w-7 text-base",
    md: "h-9 w-9 text-xl",
    lg: "h-11 w-11 text-2xl",
  } as const;

  const shapeClass = cn(
    "inline-flex items-center justify-center rounded-md border border-border bg-card text-foreground overflow-hidden",
    sizeMap[size],
    className
  );

  if (post.pageIconEmoji) {
    return <span className={shapeClass}>{post.pageIconEmoji}</span>;
  }

  if (post.pageIconUrl) {
    return (
      <span className={shapeClass}>
        <Image
          src={post.pageIconUrl}
          alt={`${post.title} icon`}
          width={44}
          height={44}
          unoptimized
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  return (
    <span className={shapeClass}>
      <span className="font-semibold">{post.title.slice(0, 1).toUpperCase()}</span>
    </span>
  );
}

type PostCoverProps = {
  post: PostVisualMeta;
  className?: string;
  imageClassName?: string;
  showFallbackTitle?: boolean;
  showFallbackIcon?: boolean;
};

export function PostCover({
  post,
  className,
  imageClassName,
  showFallbackTitle = true,
  showFallbackIcon = true,
}: PostCoverProps) {
  if (post.coverUrl) {
    return (
      <div className={cn("relative overflow-hidden rounded-xl border bg-muted", className)}>
        <ResilientNotionImage
          src={post.coverUrl}
          alt={`${post.title} cover`}
          notionPageId={post.notionPageId}
          fill
          unoptimized
          sizes="(max-width: 768px) 100vw, 760px"
          className={cn("object-cover", imageClassName)}
          fallbackClassName="h-full rounded-none border-0"
          fallbackLabel="Cover unavailable"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-gradient-to-br from-card via-muted/50 to-accent/40",
        className
      )}
    >
      <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/15 blur-2xl" />
      <div className="relative flex h-full items-end gap-3 p-4">
        {showFallbackIcon ? <PostIcon post={post} size="md" /> : null}
        {showFallbackTitle ? <p className="line-clamp-2 text-sm font-semibold">{post.title}</p> : null}
      </div>
    </div>
  );
}
