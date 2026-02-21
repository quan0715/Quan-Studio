"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent } from "@/presentation/components/ui/card";
import { PostIcon } from "@/presentation/features/blog/post-visual";
import { ProjectCard } from "@/presentation/features/project/project-card";
import { formatIsoToUtcDate } from "@/presentation/lib/date-time";
import { cn } from "@/presentation/lib/utils";
import type { PostListItemDto } from "@/presentation/types/post";
import type { ProjectItem } from "@/presentation/types/project";

export type SocialLink = {
  label: string;
  url: string;
  platform: string;
  logo: { emoji: string | null; url: string | null } | null;
};

type HomeLandingProps = {
  latestPosts: PostListItemDto[];
  socialLinks: SocialLink[];
  projects: ProjectItem[];
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
  visual?: "creative-icons";
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

const DEFAULT_SOCIAL_LINKS: Array<{ label: string; href: string; logoUrl: string | null }> = [
  { label: "GitHub", href: "https://github.com/", logoUrl: "/media-logos/github.svg" },
  { label: "Gmail", href: "https://mail.google.com/", logoUrl: "/media-logos/gmail.svg" },
  { label: "Facebook", href: "https://www.facebook.com/", logoUrl: "/media-logos/facebook.svg" },
  { label: "Instagram", href: "https://www.instagram.com/", logoUrl: "/media-logos/instagram.svg" },
  { label: "LINE", href: "https://line.me/", logoUrl: "/media-logos/line.svg" },
];

const SECTION_CLS = "snap-start scroll-mt-14 min-h-[calc(100dvh-3.5rem)] flex flex-col justify-center";

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

function buildGalleryBlocks(
  latestPosts: PostListItemDto[],
  projects: ProjectItem[]
): GalleryBlock[] {
  const latest = latestPosts[0] ?? null;
  const firstProject = projects[0] ?? null;

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
      title: "Creative Signal",
      subtitle: "Creative Focus",
      description: "把設計語言、產品邏輯與工程實作整合成一致體驗。",
      column: 1,
      size: "lg",
      tone: "light",
      visual: "creative-icons",
      tags: profileTags,
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
      id: "project-preview",
      title: firstProject ? firstProject.name : "Projects",
      subtitle: "Featured Project",
      description: firstProject?.description ?? "瀏覽我的專案作品集，涵蓋設計與工程實作。",
      column: 3,
      size: "lg",
      tone: "dark",
      tags: firstProject?.tags.slice(0, 3),
    },
    {
      id: "blog-preview",
      title: latest ? latest.title : "Latest Blog Post",
      subtitle: latest ? `Blog · ${formatIsoToUtcDate(latest.updatedAt)}` : "Blog",
      description: latest?.excerpt ?? "記錄系統設計、同步流程與實作細節。",
      href: latest ? `/blog/${latest.slug}` : "/blog",
      cta: latest ? "閱讀最新文章" : "瀏覽 Blog",
      column: 3,
      size: "lg",
      tone: "image",
    },
  ];
}

export function HomeLanding({ latestPosts, socialLinks, projects }: HomeLandingProps) {
  const blocks = useMemo(
    () => buildGalleryBlocks(latestPosts, projects),
    [latestPosts, projects]
  );
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
    const el = document.documentElement;
    el.style.scrollSnapType = "y proximity";
    return () => {
      el.style.scrollSnapType = "";
    };
  }, []);

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

  const resolvedSocialLinks = socialLinks
    .filter((item) => Boolean(item.url.trim()))
    .slice(0, 8)
    .map((item) => ({
      label: item.label.trim() || item.platform.trim(),
      href: item.url.trim(),
      logoUrl: item.logo?.url ?? null,
    }));
  const contactLinks = resolvedSocialLinks.length > 0 ? resolvedSocialLinks : DEFAULT_SOCIAL_LINKS;

  const featured = latestPosts[0] ?? null;
  const restPosts = latestPosts.slice(1, 3);

  return (
    <div>
      {/* Section 1: Hero */}
      <section className={cn(SECTION_CLS, "px-4 sm:px-6 md:px-12")}>
        <div className="grid gap-8 md:grid-cols-[1.15fr_0.85fr] md:gap-10">
          <div className="flex flex-col justify-center space-y-5 md:space-y-6">
            <Badge variant="secondary" className="w-fit">
              Core Highlights
            </Badge>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl md:text-6xl">
              Hey, I&apos;m <span className="text-primary">Quan</span>
              <br />
              Designer & Developer
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground sm:text-base md:text-lg">
              Everything happens for the best. I build useful products with strong execution across
              design, engineering, and content systems.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/resume">完整履歷</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/blog">查看文章</Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-col items-start justify-center gap-4 md:items-end">
            <div className="relative h-40 w-40 overflow-hidden rounded-full border border-border bg-muted sm:h-52 sm:w-52 md:h-72 md:w-72">
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
            </div>
            <div className="grid w-full max-w-xs grid-cols-3 gap-2 sm:max-w-sm">
              {quickStats.map((stat) => (
                <div key={stat.label} className="rounded-xl border border-border bg-card p-3 text-center">
                  <p className="text-lg font-semibold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: About Me (Gallery) */}
      <section ref={galleryRef} className={cn(SECTION_CLS, "space-y-5 px-4 py-10 sm:px-6 md:px-12")}>
        <div className="space-y-2">
          <Badge variant="outline">About Me</Badge>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">
            About Me
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
            快速瀏覽我的背景、經歷、技能與最新動態，往下滑可看到更多完整內容。
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

                      {block.visual === "creative-icons" ? (
                        <div className="mt-auto grid grid-cols-3 gap-2">
                          <div className="flex h-14 items-center justify-center rounded-lg border bg-background/70">
                            <svg viewBox="0 0 24 24" className="h-7 w-7 text-primary">
                              <path fill="currentColor" d="M12 2l1.6 4.4L18 8l-4.4 1.6L12 14l-1.6-4.4L6 8l4.4-1.6L12 2z" />
                            </svg>
                          </div>
                          <div className="flex h-14 items-center justify-center rounded-lg border bg-background/70">
                            <svg viewBox="0 0 24 24" className="h-7 w-7 text-primary">
                              <path fill="currentColor" d="M4 16c0 2.2 1.8 4 4 4h8a4 4 0 0 0 0-8h-1.2A5.8 5.8 0 0 0 4 13.8V16zm7-9.5L9.5 8l6.5 6.5L17.5 13L11 6.5z" />
                            </svg>
                          </div>
                          <div className="flex h-14 items-center justify-center rounded-lg border bg-background/70">
                            <svg viewBox="0 0 24 24" className="h-7 w-7 text-primary">
                              <path fill="currentColor" d="M12 3a9 9 0 1 0 9 9c0-2-1.6-3.6-3.6-3.6h-2.1a1.8 1.8 0 0 1 0-3.6h1A4.3 4.3 0 0 0 12 3zM7 12a1.2 1.2 0 1 1 0 2.4A1.2 1.2 0 0 1 7 12zm4-4a1.2 1.2 0 1 1 0 2.4A1.2 1.2 0 0 1 11 8z" />
                            </svg>
                          </div>
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

      {/* Section 3: Projects */}
      <section className={cn(SECTION_CLS, "space-y-5 px-4 py-10 sm:px-6 md:px-12")}>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Badge variant="outline">Projects</Badge>
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">
              Side Projects & Works
            </h2>
          </div>
        </div>
        {projects.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.slice(0, 6).map((item) => (
              <ProjectCard key={item.key} item={item} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">尚無專案資料。</p>
        )}
      </section>

      {/* Section 4: Blog — Bento Layout */}
      {latestPosts.length > 0 ? (
        <section className={cn(SECTION_CLS, "space-y-5 px-4 py-10 sm:px-6 md:px-12")}>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Badge variant="outline">Blog</Badge>
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">
                Latest Posts
              </h2>
            </div>
            <Link
              href="/blog"
              className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              查看全部文章 →
            </Link>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Featured post — spans 2 columns on lg */}
            {featured ? (
              <Link href={`/blog/${featured.slug}`} className="group block lg:col-span-2">
                <Card className="h-full overflow-hidden rounded-3xl border border-zinc-800 bg-[linear-gradient(160deg,#111_0%,#24244a_35%,#3d2f36_65%,#5e5050_100%)] p-0 text-zinc-100 transition-transform duration-300 group-hover:scale-[1.01]">
                  <CardContent className="flex h-full min-h-[260px] flex-col justify-end gap-3 p-6 sm:p-8">
                    <div className="flex items-center gap-2">
                      <PostIcon post={featured} size="sm" />
                      <Badge variant="secondary" className="bg-white/10 text-zinc-100">
                        {formatIsoToUtcDate(featured.updatedAt)}
                      </Badge>
                    </div>
                    <h3 className="text-xl font-semibold leading-tight sm:text-2xl">
                      {featured.title}
                    </h3>
                    {featured.excerpt ? (
                      <p className="line-clamp-3 max-w-xl text-sm leading-relaxed text-zinc-200/90">
                        {featured.excerpt}
                      </p>
                    ) : null}
                    {featured.tags.length > 0 ? (
                      <div className="mt-auto flex flex-wrap gap-1.5">
                        {featured.tags.slice(0, 4).map((tag) => (
                          <Badge key={tag} variant="secondary" className="bg-white/10 text-zinc-100">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </Link>
            ) : null}
            {/* Rest posts — 1 column each */}
            {restPosts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="group block">
                <Card className="h-full transition-transform duration-300 group-hover:scale-[1.01]">
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <PostIcon post={post} size="sm" />
                      <Badge variant="secondary">
                        {formatIsoToUtcDate(post.updatedAt)}
                      </Badge>
                    </div>
                    <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
                      {post.title}
                    </h3>
                    {post.excerpt ? (
                      <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                        {post.excerpt}
                      </p>
                    ) : null}
                    {post.tags.length > 0 ? (
                      <div className="mt-auto flex flex-wrap gap-1.5">
                        {post.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Section 5: Contact */}
      <section className={cn(SECTION_CLS, "space-y-5 px-4 py-10 sm:px-6 md:px-12")}>
        <div className="space-y-2">
          <Badge variant="outline">Contact</Badge>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">
            Get in Touch
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
            有任何合作想法、問題或只是想打個招呼？歡迎透過以下方式聯繫我。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {contactLinks.map((item) => (
            <a
              key={item.label}
              href={item.href}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 rounded-none border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground"
            >
              {item.logoUrl ? (
                <Image
                  src={item.logoUrl}
                  alt={`${item.label} logo`}
                  width={14}
                  height={14}
                  className="h-3.5 w-3.5 object-contain"
                />
              ) : null}
              {item.label}
            </a>
          ))}
        </div>
        <Button asChild>
          <a href="mailto:contact@quandev.com">Email Me</a>
        </Button>
      </section>
    </div>
  );
}
