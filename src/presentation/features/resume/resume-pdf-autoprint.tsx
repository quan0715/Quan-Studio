"use client";

import { useEffect } from "react";

export function ResumePdfAutoPrint({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const timer = window.setTimeout(() => {
      window.print();
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [enabled]);

  return null;
}
