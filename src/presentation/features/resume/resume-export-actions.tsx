"use client";

import { Button } from "@/presentation/components/ui/button";
import { cn } from "@/presentation/lib/utils";

export function openResumePdf(): void {
  window.open("/resume-pdf?autoprint=1", "_blank", "noopener,noreferrer");
}

export function ResumeExportButton({
  label = "Download PDF",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <Button type="button" size="sm" onClick={openResumePdf} className={cn(className)}>
      {label}
    </Button>
  );
}

