export const integrationConfigKeys = {
  notionBlogDataSourceId: "notion.blog.data_source_id",
  notionResumeDataSourceId: "notion.resume.data_source_id",
  notionSchemaFieldMapping: "notion.schema.field_mapping",
} as const;

export type IntegrationConfigKey =
  (typeof integrationConfigKeys)[keyof typeof integrationConfigKeys];

export type IntegrationConfig = {
  id: string;
  key: IntegrationConfigKey;
  value: string;
  createdAt: Date;
  updatedAt: Date;
};
