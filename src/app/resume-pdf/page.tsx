import { ResumePdfAutoPrint } from "@/presentation/features/resume/resume-pdf-autoprint";
import { ResumeContentRenderer } from "@/presentation/features/resume/resume-content-renderer";
import { pickProfileFromRows } from "@/presentation/lib/profile-model";
import { findGroup, findGroupInSections, findSection, normalizePeriod } from "@/presentation/lib/resume-helpers";
import { serverApiRequest } from "@/presentation/lib/server-api-client";
import { toResumeSections } from "@/presentation/lib/transform-resume-model-rows";
import type { PublicModelQueryResponse } from "@/presentation/types/notion-model-query";
import type { ResumeEntry, ResumeSection } from "@/presentation/types/resume";

export default async function ResumePdfPage({
  searchParams,
}: {
  searchParams: Promise<{ autoprint?: string }>;
}) {
  const params = await searchParams;
  const shouldAutoPrint = params.autoprint === "1";
  const [response, profileResponse] = await Promise.all([
    serverApiRequest<PublicModelQueryResponse>("/api/public/models/resume?limit=500"),
    serverApiRequest<PublicModelQueryResponse>("/api/public/models/profile?limit=10"),
  ]);

  if (!response.ok) {
    return renderPdfError("Resume API Error", response.error.code, response.error.message);
  }

  if (!profileResponse.ok) {
    return renderPdfError("Profile API Error", profileResponse.error.code, profileResponse.error.message);
  }

  const sections = toResumeSections(response.data.rows, { target: "pdf" });
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
  const projectSection =
    findSection(sections, "projects", "Projects") ?? findSection(sections, "project", "Project");
  const awardsSection =
    findSection(sections, "awards", "Awards") ?? findSection(sections, "award", "Award");

  const profile = pickProfileFromRows(profileResponse.data.rows);
  if (!profile) {
    return renderPdfError("Profile Data Error", "PROFILE_DATA_MISSING", "profile model has no usable row.");
  }

  const missingProfileFields = getMissingProfileFields(profile);
  if (missingProfileFields.length > 0) {
    return renderPdfError(
      "Profile Data Error",
      "PROFILE_DATA_MISSING_FIELDS",
      `missing required profile fields: ${missingProfileFields.join(", ")}`
    );
  }

  const fullName = profile.fullName;
  const headline = profile.headline;
  const summaryText = profile.summary;
  const location = profile.location;
  const email = profile.email;
  const phone = profile.phone;
  const contactItems = [
    location ? `Location: ${location}` : null,
    email ? `Mail: ${email}` : null,
    phone ? `Phone: ${phone}` : null,
  ].filter((item): item is string => Boolean(item));
  const educationItems = sortEntriesByTime(findGroup(aboutSection, "education", "Education")?.entries ?? []);
  const skillItems = findGroup(aboutSection, "skills", "Skills")?.entries ?? [];
  const awardItems =
    sortEntriesByTime(
      flattenSectionEntries(awardsSection) ??
        findGroupInSections(sections, [
          { id: "awards", title: "Awards" },
          { id: "award", title: "Award" },
        ])?.entries ??
        []
    );

  const experienceItems = sortEntriesByTime(flattenSectionEntriesWithGroup(workSection));
  const projectItems = sortEntriesByTime(flattenSectionEntriesWithGroup(projectSection));

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
        className="mx-auto min-h-[297mm] w-[210mm] bg-white p-[10mm] text-black shadow-xl print:min-h-0 print:w-auto print:p-[10mm] print:shadow-none"
        style={{ fontFamily: "Helvetica Neue, Arial, Noto Sans TC, sans-serif" }}
      >
        <header className="pb-2">
          {headline ? <p className="text-[12px] font-medium text-neutral-700">{headline}</p> : null}
          <p className={headline ? "mt-0.5 text-[1.8rem] font-semibold leading-none" : "text-[1.8rem] font-semibold leading-none"}>
            {fullName}
          </p>
          {contactItems.length > 0 ? (
            <div className="mt-1 flex flex-wrap items-center gap-y-0.5 text-[10px] text-neutral-700">
              {contactItems.map((item, index) => (
                <span
                  key={item}
                  className={index === 0 ? "pr-3" : index === contactItems.length - 1 ? "border-l border-neutral-300 pl-3" : "border-l border-neutral-300 px-3"}
                >
                  {item}
                </span>
              ))}
            </div>
          ) : null}
          {summaryText ? <p className="mt-1.5 text-[10px] leading-4 text-neutral-800">{summaryText}</p> : null}
        </header>

        <div className="mt-2.5 space-y-2.5">
          <ResumePdfSection title="Education" items={educationItems} />
          <ResumePdfSection title="Work Experience" items={experienceItems} itemGapClass="space-y-2" />
          {projectItems.length > 0 ? (
            <ResumePdfSection title="Projects" items={projectItems} itemGapClass="space-y-2" />
          ) : null}
          {awardItems.length > 0 ? <ResumePdfSection title="Awards" items={awardItems} /> : null}
          <ResumePdfSection title="Skills" items={skillItems} showMeta={false} />
        </div>
      </article>
    </main>
  );
}

type ResumePdfItem = ResumeEntry & {
  organization?: string;
};

type ResumePdfSectionProps = {
  title: string;
  items: ResumePdfItem[];
  showMeta?: boolean;
  itemGapClass?: string;
};

function ResumePdfSection({
  title,
  items,
  showMeta = true,
  itemGapClass = "space-y-1.5",
}: ResumePdfSectionProps) {
  return (
    <section>
      <h2 className="text-[12px] font-semibold uppercase tracking-[0.05em] text-neutral-900">{title}</h2>
      <div className="mt-0.5 border-b border-neutral-200" />
      <div className={`mt-1.5 ${itemGapClass}`}>
        {items.map((item) => (
          <ResumePdfItemRow
            key={item.key}
            item={item}
            showMeta={showMeta}
          />
        ))}
      </div>
    </section>
  );
}

function ResumePdfItemRow({
  item,
  showMeta,
}: {
  item: ResumePdfItem;
  showMeta: boolean;
}) {
  const periodText = item.period.label ? normalizePeriod(item.period.label) : null;
  const hasMeta = showMeta && (periodText || item.location);

  return (
    <article>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold text-neutral-900">{item.title}</p>
        {hasMeta ? (
          <p className="shrink-0 text-[10px] text-neutral-700">
            {periodText ? <span>{periodText}</span> : null}
            {periodText && item.location ? <span className="px-1 text-neutral-400">|</span> : null}
            {item.location ? <span>{item.location}</span> : null}
          </p>
        ) : null}
      </div>
      {item.summary.text ? <p className="mt-0.5 text-[10px] leading-4 text-neutral-700">{item.summary.text}</p> : null}
      {item.contentBlocks.length > 0 ? (
        <ResumeContentRenderer blocks={item.contentBlocks} className="mt-0.5 text-[10px]" emptyText="" />
      ) : null}
    </article>
  );
}

function getMissingProfileFields(profile: {
  fullName: string | null;
  headline: string | null;
  summary: string | null;
  location: string | null;
  email: string | null;
  phone: string | null;
}): string[] {
  const required: Array<{ key: keyof typeof profile; label: string }> = [
    { key: "fullName", label: "fullName" },
  ];
  return required.filter((field) => !profile[field.key]).map((field) => field.label);
}

function flattenSectionEntries(section: ResumeSection | undefined) {
  if (!section) {
    return null;
  }
  return section.groups.flatMap((group) => group.entries);
}

function flattenSectionEntriesWithGroup(section: ResumeSection | undefined) {
  if (!section) {
    return [];
  }
  return section.groups.flatMap((group) =>
    group.entries.map((item) => ({
      ...item,
      organization: group.title,
    }))
  );
}

function sortEntriesByTime<T extends { title: string; period: { start: string | null; end: string | null } }>(
  entries: T[]
): T[] {
  return [...entries].sort((a, b) => {
    const aValue = parsePeriodTime(a.period);
    const bValue = parsePeriodTime(b.period);
    if (aValue !== bValue) {
      return bValue - aValue;
    }
    return a.title.localeCompare(b.title);
  });
}

function parsePeriodTime(period: { start: string | null; end: string | null }): number {
  const value = period.start ?? period.end;
  if (!value) {
    return Number.MIN_SAFE_INTEGER;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.MIN_SAFE_INTEGER : parsed;
}

function renderPdfError(title: string, code: string, message: string) {
  return (
    <main className="bg-neutral-100 p-6 print:bg-white print:p-0">
      <article
        className="mx-auto min-h-[297mm] w-[210mm] bg-white p-[11mm] text-black shadow-xl print:min-h-0 print:w-auto print:shadow-none"
        style={{ fontFamily: "Helvetica Neue, Arial, Noto Sans TC, sans-serif" }}
      >
        <h1 className="text-lg font-semibold text-red-700">{title}</h1>
        <p className="mt-2 text-sm text-neutral-700">
          {code}: {message}
        </p>
      </article>
    </main>
  );
}
