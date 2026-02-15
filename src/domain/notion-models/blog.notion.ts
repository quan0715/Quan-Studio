import { integrationConfigKeys } from "@/domain/integration-config/integration-config";
import {
  defineNotionModel,
  type NotionBuiltinSchemaCheck,
  type NotionSchemaFieldExpectation,
} from "@/domain/notion-models/model-descriptor";

const blogSchemaExpectations: NotionSchemaFieldExpectation[] = [
  {
    appField: "post.title",
    notionField: "Name",
    expectedType: "title",
    required: true,
    description: "文章標題",
  },
  {
    appField: "post.slug",
    notionField: "Slug",
    expectedType: "rich_text",
    required: false,
    description: "網址 slug（可選，未提供會自動生成）",
  },
  {
    appField: "post.status",
    notionField: "Status",
    expectedType: "select",
    required: false,
    description: "文章狀態（published / draft）",
  },
  {
    appField: "post.excerpt",
    notionField: "Excerpt",
    expectedType: "rich_text",
    required: false,
    description: "摘要",
  },
  {
    appField: "post.tags",
    notionField: "Tags",
    expectedType: "multi_select",
    required: false,
    description: "標籤",
  },
  {
    appField: "sync.status",
    notionField: "Sync Status",
    expectedType: "status",
    required: true,
    description: "同步流程狀態欄位（IDLE/Processing/Success/Failed）",
  },
];

const blogBuiltinChecks: NotionBuiltinSchemaCheck[] = [
  {
    appField: "post.icon",
    description: "文章 icon（使用 Notion 內建 page icon）",
    notionField: "page.icon",
    expectedType: "builtin",
    message: "Uses Notion built-in icon.",
  },
  {
    appField: "post.cover",
    description: "文章封面（優先使用 Notion 內建 page cover）",
    notionField: "page.cover",
    expectedType: "builtin",
    message: "Uses Notion built-in cover.",
  },
  {
    appField: "post.createdTime",
    description: "文章建立時間（使用 Notion 內建 created_time）",
    notionField: "page.created_time",
    expectedType: "builtin",
    message: "Uses Notion built-in created time.",
  },
  {
    appField: "post.lastEditedTime",
    description: "文章最後編輯時間（使用 Notion 內建 last_edited_time）",
    notionField: "page.last_edited_time",
    expectedType: "builtin",
    message: "Uses Notion built-in last edited time.",
  },
];

export const blogNotionModel = defineNotionModel({
  id: "blog",
  label: "Blog",
  defaultDisplayName: "Blog Model",
  dataSourceConfigKey: integrationConfigKeys.notionBlogDataSourceId,
  schemaSource: "blog",
  schemaMapping: {
    expectations: blogSchemaExpectations,
    builtinChecks: blogBuiltinChecks,
  },
});
