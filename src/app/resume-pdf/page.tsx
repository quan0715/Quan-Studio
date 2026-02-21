import Image from "next/image";
import { ResumePdfAutoPrint } from "@/presentation/features/resume/resume-pdf-autoprint";
import { findGroup, findGroupInSections, findSection, normalizePeriod } from "@/presentation/lib/resume-helpers";
import { serverApiRequest } from "@/presentation/lib/server-api-client";
import { toResumeSections } from "@/presentation/lib/transform-resume-model-rows";
import type { PublicModelQueryResponse, TypedFieldValue } from "@/presentation/types/notion-model-query";

export default async function ResumePdfPage({
  searchParams,
}: {
  searchParams: Promise<{ autoprint?: string }>;
}) {
  const params = await searchParams;
  const shouldAutoPrint = params.autoprint === "1";
  const [response, mediaLinksResponse] = await Promise.all([
    serverApiRequest<PublicModelQueryResponse>("/api/public/models/resume?limit=500"),
    serverApiRequest<PublicModelQueryResponse>("/api/public/models/media-link?limit=100"),
  ]);

  const resumeLinks = mediaLinksResponse.ok
    ? mediaLinksResponse.data.rows
        .filter((row) => readBooleanBySuffix(row, "showOnResume"))
        .map((row) => ({
          label: readStringBySuffix(row, "label") ?? "",
          url: readStringBySuffix(row, "url") ?? "",
          platform: readStringBySuffix(row, "platform") ?? "",
        }))
    : [];

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

  const sections = toResumeSections(response.data.rows);
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

  const profileItem = findGroup(aboutSection, "profile", "Profile")?.entries[0];
  const educationItems = findGroup(aboutSection, "education", "Education")?.entries ?? [];
  const skillItems = findGroup(aboutSection, "skills", "Skills")?.entries ?? [];
  const awardItems =
    findGroupInSections(sections, [
      { id: "awards", title: "Awards" },
      { id: "award", title: "Award" },
    ])?.entries ?? [];
  const certificationItems =
    findGroupInSections(sections, [
      { id: "certifications", title: "Certifications" },
      { id: "certification", title: "Certification" },
    ])?.entries ?? [];

  const experienceItems =
    workSection?.groups.flatMap((group) =>
      group.entries.map((item) => ({
        ...item,
        organization: group.title,
      }))
    ) ?? [];

  return (
    <main className="bg-neutral-100 p-6 print:bg-white print:p-0">
      <style>{`
        @page {
          size: A4;
          margin: 0;
        }

        @media print {
          body {
            background: #ffffff !important;
          }
        }
      `}</style>

      <ResumePdfAutoPrint enabled={shouldAutoPrint} />

      <article
        className="mx-auto min-h-[297mm] w-[210mm] bg-white p-[11mm] text-black shadow-xl print:min-h-0 print:w-auto print:p-[11mm] print:shadow-none"
        style={{ fontFamily: "Helvetica Neue, Arial, Noto Sans TC, sans-serif" }}
      >
        <header className="border-b border-neutral-300 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[2rem] font-semibold leading-none">Quan</p>
              <p className="mt-1 text-sm font-medium text-neutral-700">Designer & Developer</p>
            </div>
            <div className="space-y-1 text-right text-[11px] text-neutral-700">
              {resumeLinks.length > 0
                ? resumeLinks.map((link) => (
                    <p key={link.label}>
                      {link.platform || link.label}: {link.url.replace(/^https?:\/\//, "")}
                    </p>
                  ))
                : (
                  <>
                    <p>Email: hi@quan.studio</p>
                    <p>GitHub: github.com/quan</p>
                    <p>LinkedIn: linkedin.com/in/quan</p>
                    <p>Taiwan</p>
                  </>
                )}
            </div>
          </div>
          <p className="mt-3 text-[12px] leading-5 text-neutral-800">{profileItem?.summary.text}</p>
        </header>

        <div className="mt-4 space-y-4">
          <section>
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-neutral-900">
              Highlights
            </h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {aboutSection?.tags.map((tag) => (
                <span key={tag} className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-700">
                  {tag}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-neutral-900">
              Education
            </h2>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {educationItems.map((item) => (
                <article key={item.key}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[11px] font-semibold text-neutral-900">{item.title}</p>
                    {item.media.logoUrl ? (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center p-0.5">
                        <Image
                          src={item.media.logoUrl}
                          alt={`${item.title} logo`}
                          width={32}
                          height={32}
                          className="h-full w-full object-contain"
                        />
                      </div>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[10px] text-neutral-700">
                    {normalizePeriod(item.period.label ?? "")}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-neutral-900">
              Skills
            </h2>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
              {skillItems.map((item) => (
                <article key={item.key}>
                  <p className="text-[11px] font-semibold text-neutral-900">{item.title}</p>
                  <p className="text-[10px] leading-4 text-neutral-700">{item.summary.text}</p>
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
                  <article key={item.key}>
                    <div className="flex items-center gap-x-3">
                      <p className="text-[11px] font-semibold text-neutral-900">{item.title}</p>
                      {item.period.label ? (
                        <p className="text-[10px] text-neutral-700">
                          {normalizePeriod(item.period.label)}
                        </p>
                      ) : null}
                    </div>
                    {item.summary.text ? (
                      <p className="mt-1 text-[10px] leading-4 text-neutral-700">{item.summary.text}</p>
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
                  <article key={item.key}>
                    <div className="flex items-center gap-x-3">
                      <p className="text-[11px] font-semibold text-neutral-900">{item.title}</p>
                      {item.period.label ? (
                        <p className="text-[10px] text-neutral-700">
                          {normalizePeriod(item.period.label)}
                        </p>
                      ) : null}
                    </div>
                    {item.summary.text ? (
                      <p className="mt-1 text-[10px] leading-4 text-neutral-700">{item.summary.text}</p>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-neutral-900">
              Experience
            </h2>
            <div className="mt-2 space-y-2.5">
              {experienceItems.map((item) => (
                <article key={item.key}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <p className="text-[11px] font-semibold text-neutral-900">{item.organization}</p>
                        {item.period.label ? (
                          <p className="text-[10px] font-medium text-amber-700">{item.period.label}</p>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-[11px] font-semibold text-neutral-800">{item.title}</p>
                    </div>
                    {item.media.logoUrl ? (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center p-0.5">
                        <Image
                          src={item.media.logoUrl}
                          alt={`${item.title} logo`}
                          width={32}
                          height={32}
                          className="h-full w-full object-contain"
                        />
                      </div>
                    ) : null}
                  </div>
                  {item.summary.text ? (
                    <p className="mt-1 text-[10px] leading-4 text-neutral-700">{item.summary.text}</p>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        </div>
      </article>
    </main>
  );
}

function readStringBySuffix(row: Record<string, TypedFieldValue>, suffix: string): string | null {
  for (const [key, value] of Object.entries(row)) {
    if (key.endsWith(`.${suffix}`) && typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}

function readBooleanBySuffix(row: Record<string, TypedFieldValue>, suffix: string): boolean {
  for (const [key, value] of Object.entries(row)) {
    if (key.endsWith(`.${suffix}`) && typeof value === "boolean") {
      return value;
    }
  }
  return false;
}
