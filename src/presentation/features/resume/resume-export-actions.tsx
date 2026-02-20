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

export function ResumeExportActions() {
  return (
    <div className="space-y-2">
      <ResumeExportButton label="Export Latest Resume (PDF)" className="w-full sm:w-auto" />
      <p className="text-xs text-muted-foreground">
        會開啟單頁式履歷並直接觸發列印，選擇「Save as PDF」即可下載。
      </p>
    </div>
  );
}
