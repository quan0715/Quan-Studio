"use client";

import Image, { type ImageProps } from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
  const response = await fetch("/api/public/notion/refresh-media", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pageId: notionPageId,
    }),
  });

  if (!response.ok) {
    throw new Error(`refresh media failed (${response.status})`);
  }
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
  const [isLoaded, setIsLoaded] = useState(false);
  const srcKey = useMemo(() => String(imageProps.src), [imageProps.src]);
  const onImageLoad = imageProps.onLoad;
  const onImageError = imageProps.onError;

  useEffect(() => {
    setHasError(false);
    setIsRecovering(false);
    setIsLoaded(false);
  }, [srcKey]);

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
      className={cn(
        "transition-all duration-500 ease-out",
        isLoaded ? "scale-100 opacity-100 blur-0" : "scale-[1.02] opacity-0 blur-sm",
        className
      )}
      onLoad={(event) => {
        setIsLoaded(true);
        onImageLoad?.(event);
      }}
      onError={(event) => {
        onImageError?.(event);
        void handleError();
      }}
    />
  );
}
