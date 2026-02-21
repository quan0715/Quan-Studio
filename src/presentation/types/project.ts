export type ProjectItem = {
  key: string;
  name: string;
  description: string | null;
  tags: string[];
  githubUrl: string | null;
  demoUrl: string | null;
  thumbnail: {
    emoji: string | null;
    url: string | null;
  } | null;
};

export type ProjectResponse = {
  meta: {
    generatedAt: string;
    dataSourceId: string;
  };
  items: ProjectItem[];
};
