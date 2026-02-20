import { integrationConfigKeys } from "@/domain/integration-config/integration-config";
import {
  defineNotionModel,
  type NotionBuiltinSchemaCheck,
  type NotionSchemaFieldExpectation,
  type NotionResumeGroupedProjectionDescriptor,
} from "@/domain/notion-models/model-descriptor";

const resumeSchemaExpectations: NotionSchemaFieldExpectation[] = [
  {
    appField: "resume.name",
    notionField: "Name",
    expectedType: "title",
    required: true,
    description: "履歷 item 名稱",
  },
  {
    appField: "resume.section",
    notionField: "Section",
    expectedType: "select",
    required: false,
    description: "區塊分類",
  },
  {
    appField: "resume.group",
    notionField: "Group",
    expectedType: "rich_text",
    required: false,
    description: "群組名稱",
  },
  {
    appField: "resume.summary",
    notionField: "Summary",
    expectedType: "rich_text",
    required: false,
    description: "描述與條列",
  },
  {
    appField: "resume.date",
    notionField: "Date",
    expectedType: "date",
    required: false,
    description: "期間",
  },
  {
    appField: "resume.tags",
    notionField: "Tags",
    expectedType: "multi_select",
    required: false,
    description: "關鍵字",
  },
  {
    appField: "resume.sectionOrder",
    notionField: "Section Order",
    expectedType: "number",
    required: false,
    description: "區塊排序",
  },
  {
    appField: "resume.groupOrder",
    notionField: "Group Order",
    expectedType: "number",
    required: false,
    description: "群組排序",
  },
  {
    appField: "resume.itemOrder",
    notionField: "Item Order",
    expectedType: "number",
    required: false,
    description: "項目排序",
  },
  {
    appField: "resume.visibility",
    notionField: "Visibility",
    expectedType: "select",
    required: false,
    description: "可見性（private 會被隱藏）",
  },
];

const resumeBuiltinChecks: NotionBuiltinSchemaCheck[] = [
  {
    appField: "resume.logo",
    description: "履歷項目 logo（使用 Notion 內建 page icon）",
    notionField: "page.icon",
    expectedType: "builtin",
    message: "Uses Notion built-in page icon as logo.",
  },
];

const resumeProjection: NotionResumeGroupedProjectionDescriptor = {
  kind: "resume_grouped",
  fields: {
    sectionTitle: "resume.section",
    groupTitle: "resume.group",
    entryTitle: "resume.name",
    summaryText: "resume.summary",
    periodDateRange: "resume.date",
    tags: "resume.tags",
    sectionOrder: "resume.sectionOrder",
    groupOrder: "resume.groupOrder",
    itemOrder: "resume.itemOrder",
    visibility: "resume.visibility",
    logo: "resume.logo",
  },
  visibility: {
    privateValue: "private",
  },
  defaults: {
    sectionTitle: "General",
    groupTitle: "General",
    entryTitle: "Untitled",
    maxOrder: Number.MAX_SAFE_INTEGER,
  },
  sectionOrderFallback: {
    about: 10,
    "work-experience": 20,
    experience: 20,
    projects: 30,
    project: 30,
    education: 40,
    skills: 50,
    awards: 60,
    award: 60,
    certifications: 70,
    certification: 70,
  },
  period: {
    presentLabel: "Present",
  },
};

export const resumeNotionModel = defineNotionModel({
  id: "resume",
  label: "Resume",
  defaultDisplayName: "Resume Model",
  dataSourceConfigKey: integrationConfigKeys.notionResumeDataSourceId,
  schemaSource: "resume",
  schemaMapping: {
    expectations: resumeSchemaExpectations,
    builtinChecks: resumeBuiltinChecks,
  },
  projection: resumeProjection,
});
