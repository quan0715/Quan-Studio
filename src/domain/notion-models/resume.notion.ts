import { integrationConfigKeys } from "@/domain/integration-config/integration-config";
import {
  defineNotionModel,
  type NotionSchemaFieldExpectation,
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

export const resumeNotionModel = defineNotionModel({
  id: "resume",
  label: "Resume",
  defaultDisplayName: "Resume Model",
  dataSourceConfigKey: integrationConfigKeys.notionResumeDataSourceId,
  schemaSource: "resume",
  schemaMapping: {
    expectations: resumeSchemaExpectations,
  },
});
