import { Badge } from "@/presentation/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import { ResumeExportActions } from "@/presentation/features/resume/resume-export-actions";
import { serverApiRequest } from "@/presentation/lib/server-api-client";
import type { ResumeItem, ResumeSection } from "@/presentation/types/resume";

function renderHighlightedTitle(title: string, highlightWord?: string): React.ReactNode {
  if (!highlightWord || !title.includes(highlightWord)) {
    return title;
  }

  const [before, after] = title.split(highlightWord, 2);
  return (
    <>
      {before}
      <span className="text-primary">{highlightWord}</span>
      {after}
    </>
  );
}

function ResumeItemNode({
  item,
  index,
  total,
}: {
  item: ResumeItem;
  index: number;
  total: number;
}) {
  return (
    <article className="relative pl-6">
      <span className="absolute left-0 top-[0.6rem] h-2.5 w-2.5 rounded-full bg-primary/90" />
      {index < total - 1 ? (
        <span className="absolute bottom-[-1.4rem] left-[0.27rem] top-[1.15rem] w-px bg-border" />
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
          Item
        </Badge>
        {item.period ? <p className="text-xs font-medium text-primary">{item.period}</p> : null}
      </div>

      <h4 className="mt-2 text-base font-semibold">
        {renderHighlightedTitle(item.title, item.highlightWord)}
      </h4>
      {item.organization ? <p className="text-sm text-muted-foreground">{item.organization}</p> : null}
      {item.subtitle ? <p className="text-sm text-muted-foreground">{item.subtitle}</p> : null}
      {item.summary ? <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.summary}</p> : null}

      {item.bullets?.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {item.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      ) : null}

      {item.keywords?.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.keywords.map((keyword) => (
            <Badge key={keyword} variant="secondary">
              {keyword}
            </Badge>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export default async function ResumePage() {
  const response = await serverApiRequest<ResumeSection[]>("/api/public/resume?limit=500");

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

  const sections = response.data;

  return (
    <section className="space-y-8">
      <Card>
        <CardContent className="flex flex-col gap-5 p-6 md:flex-row md:items-end md:justify-between md:p-8">
          <div className="space-y-3">
            <Badge className="w-fit">Resume</Badge>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Section → Group → Item</h1>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
              履歷內容直接來自 Notion Resume Data Source。
            </p>
          </div>
          <ResumeExportActions />
        </CardContent>
      </Card>

      {sections.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground md:p-8">
            Resume Data Source 目前沒有可顯示的資料。
          </CardContent>
        </Card>
      ) : null}

      {sections.map((section) => (
        <section
          key={section.id}
          className="grid gap-4 border-t border-border/70 pt-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-6"
        >
          <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
            <Badge variant="outline">Section</Badge>
            <h2 className="text-2xl font-semibold leading-tight tracking-tight md:text-3xl">{section.title}</h2>
            <div className="flex flex-wrap gap-2">
              {section.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="font-normal">
                  #{tag}
                </Badge>
              ))}
            </div>
          </aside>

          <div className="space-y-4 md:border-l md:border-border/70 md:pl-6">
            {section.groups.map((group) => (
              <Card key={group.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-lg md:text-xl">{group.title}</CardTitle>
                    <Badge variant="outline">Group</Badge>
                  </div>
                  {group.description ? (
                    <p className="text-sm text-muted-foreground">{group.description}</p>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-7">
                  {group.items.map((item, index) => (
                    <ResumeItemNode key={item.id} item={item} index={index} total={group.items.length} />
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
