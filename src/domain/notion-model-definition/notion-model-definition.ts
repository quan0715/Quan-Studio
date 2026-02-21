export const notionModelProjectionKinds = ["flat_list", "resume_grouped"] as const;
export type NotionModelProjectionKind = (typeof notionModelProjectionKinds)[number];

export const notionModelFieldTypes = [
  "title",
  "rich_text",
  "select",
  "multi_select",
  "status",
  "number",
  "date",
  "checkbox",
  "url",
  "file",
  "media",
  "builtin",
] as const;
export type NotionModelFieldType = (typeof notionModelFieldTypes)[number];

export const notionBuiltinFields = [
  "page.icon",
  "page.cover",
  "page.created_time",
  "page.last_edited_time",
] as const;
export type NotionBuiltinField = (typeof notionBuiltinFields)[number];

export type NotionModelField = {
  id: string;
  modelDefinitionId: string;
  fieldKey: string;
  appField: string;
  expectedType: NotionModelFieldType;
  required: boolean;
  description: string;
  defaultNotionField: string | null;
  builtinField: NotionBuiltinField | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type NotionModelDefinition = {
  id: string;
  modelKey: string;
  label: string;
  defaultDisplayName: string;
  schemaSource: string;
  projectionKind: NotionModelProjectionKind;
  projectionConfigJson: Record<string, unknown>;
  isActive: boolean;
  fields: NotionModelField[];
  dataSourceId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function isNotionModelFieldType(value: string): value is NotionModelFieldType {
  return notionModelFieldTypes.includes(value as NotionModelFieldType);
}

export function isNotionBuiltinField(value: string): value is NotionBuiltinField {
  return notionBuiltinFields.includes(value as NotionBuiltinField);
}
