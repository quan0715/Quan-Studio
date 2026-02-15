import { blogNotionModel } from "@/domain/notion-models/blog.notion";
import type { NotionModelDescriptor } from "@/domain/notion-models/model-descriptor";
import { resumeNotionModel } from "@/domain/notion-models/resume.notion";

const notionModelRegistry = [blogNotionModel, resumeNotionModel] as const;

export type NotionModelId = (typeof notionModelRegistry)[number]["id"];
export type NotionSchemaSource = Exclude<(typeof notionModelRegistry)[number]["schemaSource"], null>;

export type NotionSchemaModelDescriptor = NotionModelDescriptor & {
  schemaSource: NotionSchemaSource;
  schemaMapping: NonNullable<NotionModelDescriptor["schemaMapping"]>;
};

const notionModelById = new Map<string, NotionModelDescriptor>();
const notionModelByDataSourceKey = new Map<string, NotionModelDescriptor>();
const notionModelBySchemaSource = new Map<string, NotionSchemaModelDescriptor>();

for (const descriptor of notionModelRegistry) {
  if (notionModelById.has(descriptor.id)) {
    throw new Error(`duplicate notion model id: ${descriptor.id}`);
  }
  if (notionModelByDataSourceKey.has(descriptor.dataSourceConfigKey)) {
    throw new Error(`duplicate notion model dataSourceConfigKey: ${descriptor.dataSourceConfigKey}`);
  }
  notionModelById.set(descriptor.id, descriptor);
  notionModelByDataSourceKey.set(descriptor.dataSourceConfigKey, descriptor);

  if (isSchemaModelDescriptor(descriptor)) {
    if (notionModelBySchemaSource.has(descriptor.schemaSource)) {
      throw new Error(`duplicate notion model schemaSource: ${descriptor.schemaSource}`);
    }
    notionModelBySchemaSource.set(descriptor.schemaSource, descriptor);
  }
}

export function listNotionModels(): NotionModelDescriptor[] {
  return [...notionModelRegistry];
}

export function getNotionModelById(id: string): NotionModelDescriptor | null {
  return notionModelById.get(id) ?? null;
}

export function listNotionSchemaModels(): NotionSchemaModelDescriptor[] {
  return listNotionModels().filter(isSchemaModelDescriptor);
}

export function listNotionSchemaSources(): NotionSchemaSource[] {
  return [...notionModelBySchemaSource.keys()] as NotionSchemaSource[];
}

export function getNotionModelBySchemaSource(source: string): NotionSchemaModelDescriptor | null {
  return notionModelBySchemaSource.get(source) ?? null;
}

function isSchemaModelDescriptor(descriptor: NotionModelDescriptor): descriptor is NotionSchemaModelDescriptor {
  return descriptor.schemaSource !== null && descriptor.schemaMapping !== undefined;
}
