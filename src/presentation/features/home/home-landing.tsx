"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent } from "@/presentation/components/ui/card";
import { formatIsoToUtcDate } from "@/presentation/lib/date-time";
import { cn } from "@/presentation/lib/utils";
import type { PostListItemDto } from "@/presentation/types/post";

type HomeLandingProps = {
  latestPosts: PostListItemDto[];
};

type GalleryBlock = {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  href?: string;
  cta?: string;
  column: 1 | 2 | 3;
  size?: "sm" | "md" | "lg";
  tone?: "light" | "accent" | "dark" | "image";
  tags?: string[];
  links?: Array<{ label: string; href: string }>;
  visual?: "playful-svg";
};

const quickStats = [
  { label: "Projects", value: "20+" },
  { label: "Years", value: "3+" },
  { label: "Focus", value: "Product" },
];

const profileTags = [
  "UI/UX 設計",
  "Web 全端開發",
  "自動化工作流管理",
  "Notion CMS",
  "Design Systems",
];

function blockToneClassName(tone: GalleryBlock["tone"]): string {
  switch (tone) {
    case "accent":
      return "bg-primary text-primary-foreground border-primary/60";
    case "dark":
      return "bg-zinc-950 text-zinc-100 border-zinc-800";
    case "image":
      return "border-zinc-800 text-zinc-100 bg-[linear-gradient(160deg,#111_0%,#24244a_35%,#3d2f36_65%,#5e5050_100%)]";
    case "light":
    default:
      return "bg-card text-card-foreground border-border";
  }
}

function blockHeightClassName(size: GalleryBlock["size"] = "md"): string {
  switch (size) {
    case "sm":
      return "min-h-[130px] md:h-[130px]";
    case "lg":
      return "min-h-[220px] md:h-[220px]";
    case "md":
    default:
      return "min-h-[180px] md:h-[180px]";
  }
}

function buildGalleryBlocks(latestPosts: PostListItemDto[]): GalleryBlock[] {
  const latest = latestPosts[0] ?? null;
  const secondLatest = latestPosts[1] ?? null;

  return [
    {
      id: "intro",
      title: "我是 Quan",
      subtitle: "Designer & Developer",
      description: "產品導向的全端工程師，專注把想法交付成可維運的系統。",
      column: 1,
      size: "lg",
      tone: "accent",
    },
    {
      id: "skills",
      title: "# 快速摘要",
      description: profileTags.map((tag) => `# ${tag}`).join("  "),
      column: 1,
      size: "lg",
      tone: "light",
    },
    {
      id: "social",
      title: "快速社群連結",
      subtitle: "Connect",
      description: "快速找到我在不同平台上的最新內容與聯繫方式。",
      column: 1,
      size: "md",
      tone: "light",
      links: [
        { label: "GitHub", href: "https://github.com/" },
        { label: "LinkedIn", href: "https://www.linkedin.com/" },
        { label: "Instagram", href: "https://www.instagram.com/" },
        { label: "X", href: "https://x.com/" },
      ],
    },
    {
      id: "resume",
      title: "完整履歷",
      subtitle: "Section > Group > Item",
      description: "以模組化結構管理履歷內容，下一步可直接接 Notion 同步資料。",
      href: "/resume",
      cta: "查看履歷",
      column: 2,
      size: "md",
      tone: "dark",
    },
    {
      id: "ibm",
      title: "IBM TW",
      subtitle: "Associate Application Consultant Intern",
      description: "2023/6 - Present",
      column: 2,
      size: "lg",
      tone: "light",
      tags: ["Consultant", "ESG Platform"],
    },
    {
      id: "nycu",
      title: "NYCU CS 碩士",
      subtitle: "國立陽明交通大學",
      description: "資訊科學與工程研究所",
      column: 2,
      size: "lg",
      tone: "light",
    },
    {
      id: "playful-svg",
      title: "Creative Signal",
      subtitle: "Handmade SVG",
      description: "用一點抽象線條表現設計與工程並行的節奏。",
      column: 3,
      size: "md",
      tone: "dark",
      visual: "playful-svg",
    },
    {
      id: "blog-1",
      title: latest ? latest.title : "Latest Blog Post",
      subtitle: latest ? `Blog 01 · ${formatIsoToUtcDate(latest.updatedAt)}` : "Blog 01",
      description: latest?.excerpt ?? "記錄系統設計、同步流程與實作細節。",
      href: latest ? `/blog/${latest.slug}` : "/blog",
      cta: latest ? "閱讀最新文章" : "瀏覽 Blog",
      column: 3,
      size: "lg",
      tone: "image",
    },
    {
      id: "blog-2",
      title: secondLatest ? secondLatest.title : "Second Latest Post",
      subtitle: secondLatest ? `Blog 02 · ${formatIsoToUtcDate(secondLatest.updatedAt)}` : "Blog 02",
      description: secondLatest?.excerpt ?? "更多內容與技術筆記，持續更新中。",
      href: secondLatest ? `/blog/${secondLatest.slug}` : "/blog",
      cta: secondLatest ? "閱讀第二新文章" : "瀏覽全部文章",
      column: 3,
      size: "lg",
      tone: "image",
    },
  ];
}

export function HomeLanding({ latestPosts }: HomeLandingProps) {
  const blocks = useMemo(() => buildGalleryBlocks(latestPosts), [latestPosts]);
  const blocksByColumn = useMemo(
    () => ({
      1: blocks.filter((block) => block.column === 1),
      2: blocks.filter((block) => block.column === 2),
      3: blocks.filter((block) => block.column === 3),
    }),
    [blocks]
  );
  const galleryRef = useRef<HTMLElement | null>(null);
  const [isGalleryVisible, setIsGalleryVisible] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  useEffect(() => {
    if (!galleryRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          setIsGalleryVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(galleryRef.current);
    return () => observer.disconnect();
  }, []);

  const handleScrollToGallery = (): void => {
    galleryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-10 md:space-y-14">
      <section className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-[#09090b] text-zinc-100">
        <div className="pointer-events-none absolute -left-24 -top-32 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="grid min-h-[calc(100vh-6.5rem)] gap-8 px-4 pb-20 pt-10 sm:px-6 md:min-h-[calc(100vh-8.5rem)] md:grid-cols-[1.15fr_0.85fr] md:gap-10 md:px-12">
          <div className="flex flex-col justify-center space-y-5 md:space-y-6">
            <Badge variant="secondary" className="w-fit bg-white/10 text-zinc-100">
              Core Highlights
            </Badge>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl md:text-6xl">
              Hey, I&apos;m <span className="text-primary">Quan</span>
              <br />
              Designer & Developer
            </h1>
            <p className="max-w-xl text-sm text-zinc-400 sm:text-base md:text-lg">
              Everything happens for the best. I build useful products with strong execution across
              design, engineering, and content systems.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/resume">完整履歷</Link>
              </Button>
              <Button asChild variant="outline" className="border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800">
                <Link href="/blog">查看文章</Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-col items-start justify-center gap-4 md:items-end">
            <div className="relative h-40 w-40 overflow-hidden rounded-full border border-zinc-700 bg-zinc-900 sm:h-52 sm:w-52 md:h-72 md:w-72">
              {!avatarLoadFailed ? (
                <Image
                  src="/avatar-portrait.jpg"
                  alt="Quan avatar"
                  fill
                  sizes="(max-width: 640px) 160px, (max-width: 768px) 208px, 288px"
                  className="object-cover"
                  onError={() => setAvatarLoadFailed(true)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-7xl font-semibold text-primary">
                  Q
                </div>
              )}
              <span className="absolute inset-0 rounded-full border border-white/5" />
            </div>
            <div className="grid w-full max-w-xs grid-cols-3 gap-2 sm:max-w-sm">
              {quickStats.map((stat) => (
                <div key={stat.label} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 text-center">
                  <p className="text-lg font-semibold text-zinc-100">{stat.value}</p>
                  <p className="text-xs text-zinc-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <button
            type="button"
            onClick={handleScrollToGallery}
            className="flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-950/80 px-4 py-2 text-xs text-zinc-200 transition hover:bg-zinc-900"
          >
            Scroll to Gallery
            <span className="animate-bounce">↓</span>
          </button>
        </div>
      </section>

      <section ref={galleryRef} className="space-y-5">
        <div className="space-y-2">
          <Badge variant="outline">Quick Blocks</Badge>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">
            Apple-style Product Gallery, focused on my profile
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
            向下卷動後進入摘要視圖，快速瀏覽我的背景、經歷、技能與最新文章。
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {([1, 2, 3] as const).map((column) => (
            <div key={`column-${column}`} className="space-y-4">
              {blocksByColumn[column].map((block) => {
                const index = blocks.findIndex((item) => item.id === block.id);
            const content = (
              <Card
                className={cn(
                  "h-full overflow-hidden rounded-3xl border p-0 transition-all duration-700",
                  blockHeightClassName(block.size),
                  blockToneClassName(block.tone),
                  isGalleryVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
                )}
                style={{ transitionDelay: `${index * 70}ms` }}
              >
                <CardContent className="flex h-full flex-col gap-3 p-4 sm:p-5 md:p-6">
                  {block.subtitle ? (
                    <p className={cn("text-xs font-medium uppercase tracking-wide", block.tone === "image" ? "text-zinc-200" : "text-muted-foreground")}>
                      {block.subtitle}
                    </p>
                  ) : null}
                  <h3 className="text-xl font-semibold leading-tight sm:text-2xl">{block.title}</h3>
                  {block.description ? (
                    <p className={cn("line-clamp-4 text-sm leading-7", block.tone === "image" ? "text-zinc-200/95" : "text-muted-foreground")}>
                      {block.description}
                    </p>
                  ) : null}

                  {block.visual === "playful-svg" ? (
                    <div className="mt-auto overflow-hidden rounded-xl border border-white/15 bg-black/20 p-2">
                      <svg viewBox="0 0 300 110" className="h-[92px] w-full">
                        <defs>
                          <linearGradient id="signalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#f5a524" />
                            <stop offset="45%" stopColor="#60a5fa" />
                            <stop offset="100%" stopColor="#34d399" />
                          </linearGradient>
                        </defs>
                        <path d="M 8 82 C 42 30, 80 30, 112 82 S 186 134, 230 58 S 282 28, 292 66" stroke="url(#signalGrad)" strokeWidth="4" fill="none" />
                        <circle cx="44" cy="40" r="12" fill="none" stroke="#f5a524" strokeWidth="3" />
                        <circle cx="156" cy="74" r="9" fill="#60a5fa" opacity="0.75" />
                        <rect x="236" y="18" width="38" height="38" rx="8" fill="none" stroke="#34d399" strokeWidth="3" />
                      </svg>
                    </div>
                  ) : null}

                  {block.links?.length ? (
                    <div className="mt-auto flex flex-wrap gap-2">
                      {block.links.map((item) => (
                        <a
                          key={`${block.id}-${item.label}`}
                          href={item.href}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="rounded-full border px-3 py-1 text-xs font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground"
                        >
                          {item.label}
                        </a>
                      ))}
                    </div>
                  ) : null}

                  {block.tags?.length ? (
                    <div className="mt-auto flex flex-wrap gap-1.5">
                      {block.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant={block.tone === "dark" || block.tone === "image" ? "secondary" : "outline"}
                          className={block.tone === "dark" || block.tone === "image" ? "bg-white/10 text-zinc-100" : ""}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : null}

                  {block.href && block.cta ? (
                    <p className={cn("mt-auto text-sm font-medium", block.tone === "image" ? "text-zinc-100" : "text-primary")}>
                      {block.cta} →
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            );

            if (!block.href) {
              return (
                <div key={block.id}>
                  {content}
                </div>
              );
            }

            return (
              <Link key={block.id} href={block.href} className="group block">
                <div className="h-full transition-transform duration-300 group-hover:scale-[1.01]">
                  {content}
                </div>
              </Link>
            );
              })}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
