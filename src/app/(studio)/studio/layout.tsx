import Link from "next/link";
import { Badge } from "@/presentation/components/ui/badge";
import { StudioLogoutButton } from "@/presentation/features/studio-auth/studio-logout-button";

export default function StudioLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/studio/posts" className="text-sm font-semibold tracking-wide">
              STUDIO
            </Link>
            <nav className="flex items-center gap-3 text-xs">
              <Link href="/studio/posts" className="hover:underline">
                Monitor
              </Link>
              <Link href="/studio/sync-queue" className="hover:underline">
                Sync Queue
              </Link>
              <Link href="/studio/settings/notion" className="hover:underline">
                Settings
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">NOTION CMS</Badge>
            <StudioLogoutButton />
            <Link href="/" className="text-xs hover:underline">
              Back to site
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
