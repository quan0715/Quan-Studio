"use client";

import { usePathname } from "next/navigation";
import { ResumeExportButton } from "@/presentation/features/resume/resume-export-actions";

export function ResumeExportDock() {
  const pathname = usePathname();

  if (pathname !== "/resume") {
    return null;
  }

  return (
    <>
      <ResumeExportButton className="hidden sm:inline-flex" />
      <div className="fixed bottom-5 right-4 z-30 sm:hidden">
        <ResumeExportButton label="Export PDF" className="shadow-lg" />
      </div>
    </>
  );
}
