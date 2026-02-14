import Image from "next/image";
import { ResumePdfAutoPrint } from "@/presentation/features/resume/resume-pdf-autoprint";
import { serverApiRequest } from "@/presentation/lib/server-api-client";
import type { ResumeGroup, ResumeSection } from "@/presentation/types/resume";

function normalizePeriod(value?: string): string {
  if (!value) {
    return "";
  }

  if (value.toLowerCase() === "next") {
    return "Incoming";
  }

  return value;
}

export default async function ResumePdfPage({
  searchParams,
}: {
  searchParams: Promise<{ autoprint?: string }>;
}) {
  const params = await searchParams;
  const shouldAutoPrint = params.autoprint === "1";
  const response = await serverApiRequest<ResumeSection[]>("/api/public/resume?limit=500");
  if (!response.ok) {
    return (
      <main className="bg-neutral-100 p-6 print:bg-white print:p-0">
        <article
          className="mx-auto min-h-[297mm] w-[210mm] bg-white p-[11mm] text-black shadow-xl print:min-h-0 print:w-auto print:shadow-none"
          style={{ fontFamily: "Helvetica Neue, Arial, Noto Sans TC, sans-serif" }}
        >
          <h1 className="text-lg font-semibold text-red-700">Resume API Error</h1>
          <p className="mt-2 text-sm text-neutral-700">
            {response.error.code}: {response.error.message}
          </p>
        </article>
      </main>
    );
  }

  const sections = response.data;
  if (sections.length === 0) {
    return (
      <main className="bg-neutral-100 p-6 print:bg-white print:p-0">
        <article
          className="mx-auto min-h-[297mm] w-[210mm] bg-white p-[11mm] text-black shadow-xl print:min-h-0 print:w-auto print:shadow-none"
          style={{ fontFamily: "Helvetica Neue, Arial, Noto Sans TC, sans-serif" }}
        >
          <h1 className="text-lg font-semibold">Resume Data Source 目前沒有資料</h1>
        </article>
      </main>
    );
  }

  const aboutSection = findSection(sections, "about", "About");
  const workSection = findSection(sections, "work-experience", "Work Experience");

  const profileItem = findGroup(aboutSection, "profile", "Profile")?.items[0];
  const educationItems = findGroup(aboutSection, "education", "Education")?.items ?? [];
  const skillItems = findGroup(aboutSection, "skills", "Skills")?.items ?? [];
  const awardItems =
    findGroupInSections(sections, [
      { id: "awards", title: "Awards" },
      { id: "award", title: "Award" },
    ])?.items ?? [];
  const certificationItems =
    findGroupInSections(sections, [
      { id: "certifications", title: "Certifications" },
      { id: "certification", title: "Certification" },
    ])?.items ?? [];

  const experienceItems =
    workSection?.groups.flatMap((group) =>
      group.items.map((item) => ({
        ...item,
        organization: group.title,
      }))
    ) ?? [];

  return (
    <main className="bg-neutral-100 p-6 print:bg-white print:p-0">
      <style>{`
        @page {
          size: A4;
          margin: 11mm;
        }

        @media print {
          body {
            background: #ffffff !important;
          }
        }
      `}</style>

      <ResumePdfAutoPrint enabled={shouldAutoPrint} />

      <article
        className="mx-auto min-h-[297mm] w-[210mm] bg-white p-[11mm] text-black shadow-xl print:min-h-0 print:w-auto print:shadow-none"
        style={{ fontFamily: "Helvetica Neue, Arial, Noto Sans TC, sans-serif" }}
      >
        <header className="border-b border-neutral-300 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[2rem] font-semibold leading-none">Quan</p>
              <p className="mt-1 text-sm font-medium text-neutral-700">Designer & Developer</p>
            </div>
            <div className="space-y-1 text-right text-[11px] text-neutral-700">
              <p>Email: hi@quan.studio</p>
              <p>GitHub: github.com/quan</p>
              <p>LinkedIn: linkedin.com/in/quan</p>
              <p>Taiwan</p>
            </div>
          </div>
          <p className="mt-3 text-[12px] leading-5 text-neutral-800">{profileItem?.summary}</p>
        </header>

        <section className="mt-4 grid grid-cols-[1.05fr_1.95fr] gap-5">
          <div className="space-y-4">
            <section>
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-neutral-900">
                Highlights
              </h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {aboutSection?.tags.map((tag) => (
                  <span key={tag} className="rounded border border-neutral-300 px-1.5 py-0.5 text-[10px] text-neutral-700">
                    {tag}
                  </span>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-neutral-900">
                Education
              </h2>
              <div className="mt-2 space-y-2">
                {educationItems.map((item) => (
                  <article key={item.id} className="rounded border border-neutral-200 p-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[11px] font-semibold text-neutral-900">{item.title}</p>
                      {item.logoUrl ? (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-neutral-300 p-0.5">
                          <Image
                            src={item.logoUrl}
                            alt={`${item.title} logo`}
                            width={32}
                            height={32}
                            unoptimized
                            className="h-full w-full object-contain"
                          />
                        </div>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[10px] text-neutral-700">
                      {normalizePeriod(item.period)} · {item.subtitle}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-neutral-900">
                Skills
              </h2>
              <div className="mt-2 space-y-2">
                {skillItems.map((item) => (
                  <article key={item.id}>
                    <p className="text-[11px] font-semibold text-neutral-900">{item.title}</p>
                    <p className="text-[10px] leading-4 text-neutral-700">{item.summary}</p>
                  </article>
                ))}
              </div>
            </section>

            {awardItems.length > 0 ? (
              <section>
                <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-neutral-900">
                  Awards
                </h2>
                <div className="mt-2 space-y-2">
                  {awardItems.map((item) => (
                    <article key={item.id} className="rounded border border-neutral-200 p-2">
                      <p className="text-[11px] font-semibold text-neutral-900">{item.title}</p>
                      {item.period || item.subtitle ? (
                        <p className="mt-1 text-[10px] text-neutral-700">
                          {normalizePeriod(item.period)}
                          {item.period && item.subtitle ? " · " : ""}
                          {item.subtitle}
                        </p>
                      ) : null}
                      {item.summary ? (
                        <p className="mt-1 text-[10px] leading-4 text-neutral-700">{item.summary}</p>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {certificationItems.length > 0 ? (
              <section>
                <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-neutral-900">
                  Certifications
                </h2>
                <div className="mt-2 space-y-2">
                  {certificationItems.map((item) => (
                    <article key={item.id} className="rounded border border-neutral-200 p-2">
                      <p className="text-[11px] font-semibold text-neutral-900">{item.title}</p>
                      {item.period || item.subtitle ? (
                        <p className="mt-1 text-[10px] text-neutral-700">
                          {normalizePeriod(item.period)}
                          {item.period && item.subtitle ? " · " : ""}
                          {item.subtitle}
                        </p>
                      ) : null}
                      {item.summary ? (
                        <p className="mt-1 text-[10px] leading-4 text-neutral-700">{item.summary}</p>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <section>
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-neutral-900">
              Experience
            </h2>
            <div className="mt-2 space-y-2.5">
              {experienceItems.map((item) => (
                <article key={item.id} className="rounded border border-neutral-200 p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="text-[11px] font-semibold text-neutral-900">{item.organization}</p>
                      {item.period ? (
                        <p className="text-[10px] font-medium text-amber-700">{item.period}</p>
                      ) : null}
                    </div>
                    {item.logoUrl ? (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-neutral-300 p-0.5">
                        <Image
                          src={item.logoUrl}
                          alt={`${item.title} logo`}
                          width={32}
                          height={32}
                          unoptimized
                          className="h-full w-full object-contain"
                        />
                      </div>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[11px] font-semibold text-neutral-800">{item.title}</p>
                  {item.summary ? (
                    <p className="mt-1 text-[10px] leading-4 text-neutral-700">{item.summary}</p>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        </section>
      </article>
    </main>
  );
}

function findSection(sections: ResumeSection[], id: string, title: string): ResumeSection | undefined {
  const idLower = id.toLowerCase();
  const titleLower = title.toLowerCase();
  return sections.find(
    (section) => section.id.toLowerCase() === idLower || section.title.toLowerCase() === titleLower
  );
}

function findGroup(section: ResumeSection | undefined, id: string, title: string): ResumeGroup | undefined {
  if (!section) {
    return undefined;
  }

  const idLower = id.toLowerCase();
  const titleLower = title.toLowerCase();
  return section.groups.find((group) => group.id.toLowerCase() === idLower || group.title.toLowerCase() === titleLower);
}

function findGroupInSections(
  sections: ResumeSection[],
  matchers: Array<{ id: string; title: string }>
): ResumeGroup | undefined {
  for (const section of sections) {
    for (const matcher of matchers) {
      const match = findGroup(section, matcher.id, matcher.title);
      if (match) {
        return match;
      }
    }
  }

  return undefined;
}
