import Image from "next/image";
import { Badge } from "@/presentation/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import { serverApiRequest } from "@/presentation/lib/server-api-client";
import type { ResumeEntry, ResumeResponse } from "@/presentation/types/resume";

function ResumeItemNode({
  item,
  index,
  total,
}: {
  item: ResumeEntry;
  index: number;
  total: number;
}) {
  return (
    <article className="relative pl-6">
      <span className="absolute left-0 top-[0.6rem] h-2.5 w-2.5 rounded-full bg-primary/90" />
      {index < total - 1 ? (
        <span className="absolute bottom-[-1.4rem] left-[0.27rem] top-[1.15rem] w-px bg-border" />
      ) : null}

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {item.period.label ? <p className="font-medium text-primary">{item.period.label}</p> : null}
      </div>

      <h4 className="mt-1 text-base font-semibold">{item.title}</h4>
      <div
        className={`mt-1 grid gap-3 ${
          item.media.logoUrl ? "grid-cols-[minmax(0,1fr)_64px] items-start md:grid-cols-[minmax(0,1fr)_72px]" : ""
        }`}
      >
        <div>
          {item.summary.text ? (
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.summary.text}</p>
          ) : null}

          {item.summary.bullets.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {item.summary.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          ) : null}

          {item.tags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  #{tag}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>

        {item.media.logoUrl ? (
          <div className="flex justify-end pt-1">
            <div className="flex h-14 w-14 items-center justify-center rounded-md border border-border/70 bg-muted/30 p-1 md:h-16 md:w-16">
              <Image
                src={item.media.logoUrl}
                alt={`${item.title} logo`}
                width={64}
                height={64}
                unoptimized
                className="h-full w-full object-contain"
              />
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default async function ResumePage() {
  const response = await serverApiRequest<ResumeResponse>("/api/public/resume?limit=500");

  if (!response.ok) {
    return (
      <section className="space-y-8">
        <Card>
          <CardContent className="p-6 md:p-8">
            <Badge variant="destructive" className="w-fit">
              Resume API Error
            </Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">無法載入 Resume 資料</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {response.error.code}: {response.error.message}
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  const sections = response.data.sections;

  return (
    <section className="space-y-8">
      {sections.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground md:p-8">
            Resume Data Source 目前沒有可顯示的資料。
          </CardContent>
        </Card>
      ) : null}

      {sections.map((section) => (
        <section
          key={section.key}
          className="grid gap-4 pt-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-6"
        >
          <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
            <h2 className="text-2xl font-semibold leading-tight tracking-tight md:text-3xl">{section.title}</h2>
            <div className="space-y-1.5 pt-1">
              {section.tags.map((tag) => (
                <p key={tag} className="text-sm text-muted-foreground">
                  #{tag}
                </p>
              ))}
            </div>
          </aside>

          <div className="space-y-4 md:border-l md:border-border/70 md:pl-6">
            {section.groups.map((group) => (
              <Card key={group.key} className="bg-transparent ring-0 shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg md:text-xl">{group.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-7">
                  {group.entries.map((item, index) => (
                    <ResumeItemNode key={item.key} item={item} index={index} total={group.entries.length} />
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}
