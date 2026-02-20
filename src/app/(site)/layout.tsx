import Link from "next/link";
import { ResumeExportDock } from "@/presentation/features/resume/resume-export-dock";

export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const navItems = [
    { href: "/", label: "Portfolio" },
    { href: "/resume", label: "Resume" },
    { href: "/blog", label: "Blog" },
    { href: "/studio/posts", label: "Studio" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/40">
      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-4">
          <Link href="/" className="text-sm font-semibold tracking-[0.18em]">
            QUAN .
          </Link>
          <nav className="flex w-full items-center gap-1 overflow-x-auto pb-1 text-xs sm:w-auto sm:gap-2 sm:pb-0">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <ResumeExportDock />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 md:py-10">{children}</main>
    </div>
  );
}
