export type IntegrationConfigKey = string & { readonly __brand: "IntegrationConfigKey" };

export function configKey(key: string): IntegrationConfigKey {
  return key as IntegrationConfigKey;
}

export const integrationConfigKeys = {
  notionBlogDataSourceId: configKey("notion.blog.data_source_id"),
  notionResumeDataSourceId: configKey("notion.resume.data_source_id"),
  notionProjectDataSourceId: configKey("notion.project.data_source_id"),
  notionSchemaFieldMapping: configKey("notion.schema.field_mapping"),
};

export type IntegrationConfig = {
  id: string;
  key: IntegrationConfigKey;
  value: string;
  createdAt: Date;
  updatedAt: Date;
};
