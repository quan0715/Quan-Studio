import { integrationConfigKeys } from "@/domain/integration-config/integration-config";
import {
  defineNotionModel,
  type NotionBuiltinSchemaCheck,
  type NotionSchemaFieldExpectation,
  type NotionFlatListProjectionDescriptor,
} from "@/domain/notion-models/model-descriptor";

const projectSchemaExpectations: NotionSchemaFieldExpectation[] = [
  {
    appField: "project.name",
    notionField: "Name",
    expectedType: "title",
    required: true,
    description: "專案名稱",
  },
  {
    appField: "project.description",
    notionField: "Description",
    expectedType: "rich_text",
    required: false,
    description: "專案簡介",
  },
  {
    appField: "project.tags",
    notionField: "Tags",
    expectedType: "multi_select",
    required: false,
    description: "技術標籤",
  },
  {
    appField: "project.githubUrl",
    notionField: "GitHub",
    expectedType: "url",
    required: false,
    description: "GitHub repo 連結",
  },
  {
    appField: "project.demoUrl",
    notionField: "Demo",
    expectedType: "url",
    required: false,
    description: "Live demo 連結",
  },
];

const projectBuiltinChecks: NotionBuiltinSchemaCheck[] = [
  {
    appField: "project.thumbnail",
    description: "專案 icon/thumbnail（使用 Notion 內建 page icon）",
    notionField: "page.icon",
    expectedType: "builtin",
    message: "Uses Notion built-in page icon as thumbnail.",
  },
];

const projectProjection: NotionFlatListProjectionDescriptor = {
  kind: "flat_list",
  fields: {
    name: "project.name",
    description: "project.description",
    tags: "project.tags",
    githubUrl: "project.githubUrl",
    demoUrl: "project.demoUrl",
    thumbnail: "project.thumbnail",
  },
  sortBy: [{ field: "name", direction: "asc" }],
};

export const projectNotionModel = defineNotionModel({
  id: "project",
  label: "Project",
  defaultDisplayName: "Project Model",
  dataSourceConfigKey: integrationConfigKeys.notionProjectDataSourceId,
  schemaSource: "project",
  schemaMapping: {
    expectations: projectSchemaExpectations,
    builtinChecks: projectBuiltinChecks,
  },
  projection: projectProjection,
});
