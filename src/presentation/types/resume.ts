export type ResumeItem = {
  id: string;
  title: string;
  logoUrl?: string;
  period?: string;
  organization?: string;
  subtitle?: string;
  summary?: string;
  bullets?: string[];
  keywords?: string[];
  highlightWord?: string;
};

export type ResumeGroup = {
  id: string;
  title: string;
  description?: string;
  items: ResumeItem[];
};

export type ResumeSection = {
  id: string;
  title: string;
  tags: string[];
  groups: ResumeGroup[];
};
