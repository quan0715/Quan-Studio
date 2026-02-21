import type {
  NotionModelDefinition,
  NotionModelField,
  NotionModelFieldType,
  NotionModelProjectionKind,
} from "@/domain/notion-model-definition/notion-model-definition";

export type CreateNotionModelDefinitionInput = {
  modelKey: string;
  label: string;
  defaultDisplayName: string;
  schemaSource: string;
  projectionKind: NotionModelProjectionKind;
  projectionConfigJson?: Record<string, unknown>;
  isActive?: boolean;
};

export type UpdateNotionModelDefinitionInput = {
  modelKey: string;
  label?: string;
  defaultDisplayName?: string;
  schemaSource?: string;
  projectionKind?: NotionModelProjectionKind;
  projectionConfigJson?: Record<string, unknown>;
  isActive?: boolean;
};

export type AddNotionModelFieldInput = {
  modelKey: string;
  fieldKey: string;
  appField: string;
  expectedType: NotionModelFieldType;
  required: boolean;
  description: string;
  defaultNotionField: string | null;
  builtinField: string | null;
  sortOrder: number;
};

export type UpdateNotionModelFieldInput = {
  modelKey: string;
  fieldKey: string;
  nextFieldKey?: string;
  appField?: string;
  expectedType?: NotionModelFieldType;
  required?: boolean;
  description?: string;
  defaultNotionField?: string | null;
  builtinField?: string | null;
  sortOrder?: number;
};

export interface NotionModelDefinitionRepository {
  listAll(): Promise<NotionModelDefinition[]>;
  listActive(): Promise<NotionModelDefinition[]>;
  findByModelKey(modelKey: string): Promise<NotionModelDefinition | null>;
  findBySchemaSource(schemaSource: string): Promise<NotionModelDefinition | null>;
  createDefinition(input: CreateNotionModelDefinitionInput): Promise<NotionModelDefinition>;
  updateDefinition(input: UpdateNotionModelDefinitionInput): Promise<NotionModelDefinition>;
  addField(input: AddNotionModelFieldInput): Promise<NotionModelField>;
  updateField(input: UpdateNotionModelFieldInput): Promise<NotionModelField>;
  deleteField(modelKey: string, fieldKey: string): Promise<void>;
  upsertBinding(modelKey: string, dataSourceId: string): Promise<void>;
}

