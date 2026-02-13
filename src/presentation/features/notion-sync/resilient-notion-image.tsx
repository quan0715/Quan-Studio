"use client";

import Image, { type ImageProps } from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/presentation/lib/utils";

const RETRY_COOLDOWN_MS = 90_000;

type ResilientNotionImageProps = Omit<ImageProps, "alt"> & {
  alt: string;
  notionPageId?: string | null;
  fallbackClassName?: string;
  fallbackLabel?: string;
};

function shouldAttemptSync(notionPageId: string): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  const key = `notion-image-sync:${notionPageId}`;
  const last = Number(window.sessionStorage.getItem(key) ?? "0");
  const now = Date.now();

  if (Number.isFinite(last) && now - last < RETRY_COOLDOWN_MS) {
    return false;
  }

  window.sessionStorage.setItem(key, String(now));
  return true;
}

async function triggerSyncByPageId(notionPageId: string): Promise<void> {
  await fetch("/api/studio/sync-jobs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pageId: notionPageId }),
  });

  await fetch("/api/studio/sync-jobs/process-next", {
    method: "POST",
  });
}

export function ResilientNotionImage({
  alt,
  notionPageId,
  fallbackClassName,
  fallbackLabel = "Image unavailable",
  className,
  ...imageProps
}: ResilientNotionImageProps) {
  const router = useRouter();
  const [hasError, setHasError] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);

  const handleError = async (): Promise<void> => {
    if (hasError || isRecovering) {
      return;
    }

    setHasError(true);

    if (!notionPageId || !shouldAttemptSync(notionPageId)) {
      return;
    }

    setIsRecovering(true);
    try {
      await triggerSyncByPageId(notionPageId);
      router.refresh();
    } finally {
      setIsRecovering(false);
    }
  };

  if (hasError) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center rounded-md border border-dashed bg-muted/30 p-3 text-center text-xs text-muted-foreground",
          fallbackClassName
        )}
      >
        {isRecovering ? "Refreshing from Notion..." : fallbackLabel}
      </div>
    );
  }

  return (
    <Image
      {...imageProps}
      alt={alt}
      className={className}
      onError={() => {
        void handleError();
      }}
    />
  );
}
