"use client";

import { Button } from "@/presentation/components/ui/button";

function openResumePdf(): void {
  window.open("/resume-pdf?autoprint=1", "_blank", "noopener,noreferrer");
}

export function ResumeExportActions() {
  return (
    <div className="space-y-2">
      <Button type="button" onClick={openResumePdf} className="w-full sm:w-auto">
        Export Latest Resume (PDF)
      </Button>
      <p className="text-xs text-muted-foreground">
        會開啟單頁式履歷並直接觸發列印，選擇「Save as PDF」即可下載。
      </p>
    </div>
  );
}
