"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/presentation/components/ui/button";
import { logoutStudio } from "@/presentation/lib/studio-settings-api";

export function StudioLogoutButton() {
  const router = useRouter();
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => {
        void (async () => {
          await logoutStudio();
          router.replace("/studio/login");
          router.refresh();
        })();
      }}
    >
      Logout
    </Button>
  );
}
