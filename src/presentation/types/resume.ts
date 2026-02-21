export type ResumeEntry = {
  key: string;
  title: string;
  location: string | null;
  period: {
    label: string | null;
    start: string | null;
    end: string | null;
  };
  summary: {
    text: string | null;
    bullets: string[];
  };
  tags: string[];
  media: {
    logoUrl: string | null;
  };
  sort: {
    itemOrder: number | null;
    periodStart: string | null;
  };
};

export type ResumeGroup = {
  key: string;
  title: string;
  order: number;
  entries: ResumeEntry[];
};

export type ResumeSection = {
  key: string;
  title: string;
  order: number;
  tags: string[];
  groups: ResumeGroup[];
};

export type ResumeResponse = {
  meta: {
    generatedAt: string;
    dataSourceId: string;
  };
  sections: ResumeSection[];
};
