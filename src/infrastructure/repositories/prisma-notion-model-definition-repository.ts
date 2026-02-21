import type {
  AddNotionModelFieldInput,
  CreateNotionModelDefinitionInput,
  NotionModelDefinitionRepository,
  UpdateNotionModelDefinitionInput,
  UpdateNotionModelFieldInput,
} from "@/domain/notion-model-definition/notion-model-definition-repository";
import type {
  NotionModelDefinition,
  NotionModelField,
  NotionModelFieldType,
  NotionModelProjectionKind,
} from "@/domain/notion-model-definition/notion-model-definition";
import { Prisma } from "@prisma/client";
import { getPrismaClient } from "@/infrastructure/prisma/prisma-client";
import { isPlainObject } from "@/shared/utils/type-guards";

export class PrismaNotionModelDefinitionRepository implements NotionModelDefinitionRepository {
  async listAll(): Promise<NotionModelDefinition[]> {
    const rows = await getPrismaClient().notionModelDefinition.findMany({
      include: {
        fields: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
        binding: true,
      },
      orderBy: [{ modelKey: "asc" }],
    });
    return rows.map(toDomainDefinition);
  }

  async listActive(): Promise<NotionModelDefinition[]> {
    const rows = await getPrismaClient().notionModelDefinition.findMany({
      where: { isActive: true },
      include: {
        fields: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
        binding: true,
      },
      orderBy: [{ modelKey: "asc" }],
    });
    return rows.map(toDomainDefinition);
  }

  async findByModelKey(modelKey: string): Promise<NotionModelDefinition | null> {
    const row = await getPrismaClient().notionModelDefinition.findUnique({
      where: { modelKey },
      include: {
        fields: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
        binding: true,
      },
    });
    return row ? toDomainDefinition(row) : null;
  }

  async findBySchemaSource(schemaSource: string): Promise<NotionModelDefinition | null> {
    const row = await getPrismaClient().notionModelDefinition.findUnique({
      where: { schemaSource },
      include: {
        fields: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
        binding: true,
      },
    });
    return row ? toDomainDefinition(row) : null;
  }

  async createDefinition(input: CreateNotionModelDefinitionInput): Promise<NotionModelDefinition> {
    await getPrismaClient().notionModelDefinition.create({
      data: {
        modelKey: input.modelKey,
        label: input.label,
        defaultDisplayName: input.defaultDisplayName,
        schemaSource: input.schemaSource,
        projectionKind: input.projectionKind,
        projectionConfigJson: (input.projectionConfigJson ?? {}) as Prisma.InputJsonValue,
        isActive: input.isActive ?? true,
      },
    });

    const row = await this.findByModelKey(input.modelKey);
    if (!row) {
      throw new Error(`failed to create model definition: ${input.modelKey}`);
    }
    return row;
  }

  async updateDefinition(input: UpdateNotionModelDefinitionInput): Promise<NotionModelDefinition> {
    await getPrismaClient().notionModelDefinition.update({
      where: { modelKey: input.modelKey },
      data: {
        ...(input.label === undefined ? {} : { label: input.label }),
        ...(input.defaultDisplayName === undefined
          ? {}
          : { defaultDisplayName: input.defaultDisplayName }),
        ...(input.schemaSource === undefined ? {} : { schemaSource: input.schemaSource }),
        ...(input.projectionKind === undefined ? {} : { projectionKind: input.projectionKind }),
        ...(input.projectionConfigJson === undefined
          ? {}
          : { projectionConfigJson: input.projectionConfigJson as Prisma.InputJsonValue }),
        ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
      },
    });

    const row = await this.findByModelKey(input.modelKey);
    if (!row) {
      throw new Error(`failed to update model definition: ${input.modelKey}`);
    }
    return row;
  }

  async addField(input: AddNotionModelFieldInput): Promise<NotionModelField> {
    const model = await getPrismaClient().notionModelDefinition.findUnique({
      where: { modelKey: input.modelKey },
      select: { id: true },
    });
    if (!model) {
      throw new Error(`model not found: ${input.modelKey}`);
    }

    const row = await getPrismaClient().notionModelField.create({
      data: {
        modelDefinitionId: model.id,
        fieldKey: input.fieldKey,
        appField: input.appField,
        expectedType: input.expectedType,
        required: input.required,
        description: input.description,
        defaultNotionField: input.defaultNotionField,
        builtinField: input.builtinField,
        sortOrder: input.sortOrder,
      },
    });
    return toDomainField(row);
  }

  async updateField(input: UpdateNotionModelFieldInput): Promise<NotionModelField> {
    const model = await getPrismaClient().notionModelDefinition.findUnique({
      where: { modelKey: input.modelKey },
      select: { id: true },
    });
    if (!model) {
      throw new Error(`model not found: ${input.modelKey}`);
    }

    const row = await getPrismaClient().notionModelField.update({
      where: {
        modelDefinitionId_fieldKey: {
          modelDefinitionId: model.id,
          fieldKey: input.fieldKey,
        },
      },
      data: {
        ...(input.nextFieldKey === undefined ? {} : { fieldKey: input.nextFieldKey }),
        ...(input.appField === undefined ? {} : { appField: input.appField }),
        ...(input.expectedType === undefined ? {} : { expectedType: input.expectedType }),
        ...(input.required === undefined ? {} : { required: input.required }),
        ...(input.description === undefined ? {} : { description: input.description }),
        ...(input.defaultNotionField === undefined
          ? {}
          : { defaultNotionField: input.defaultNotionField }),
        ...(input.builtinField === undefined ? {} : { builtinField: input.builtinField }),
        ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder }),
      },
    });
    return toDomainField(row);
  }

  async deleteField(modelKey: string, fieldKey: string): Promise<void> {
    const model = await getPrismaClient().notionModelDefinition.findUnique({
      where: { modelKey },
      select: { id: true },
    });
    if (!model) {
      throw new Error(`model not found: ${modelKey}`);
    }
    await getPrismaClient().notionModelField.delete({
      where: {
        modelDefinitionId_fieldKey: {
          modelDefinitionId: model.id,
          fieldKey,
        },
      },
    });
  }

  async upsertBinding(modelKey: string, dataSourceId: string): Promise<void> {
    const model = await getPrismaClient().notionModelDefinition.findUnique({
      where: { modelKey },
      select: { id: true },
    });
    if (!model) {
      throw new Error(`model not found: ${modelKey}`);
    }

    await getPrismaClient().notionModelBinding.upsert({
      where: { modelDefinitionId: model.id },
      update: { dataSourceId },
      create: {
        modelDefinitionId: model.id,
        dataSourceId,
      },
    });
  }
}

function toDomainDefinition(row: {
  id: string;
  modelKey: string;
  label: string;
  defaultDisplayName: string;
  schemaSource: string;
  projectionKind: string;
  projectionConfigJson: unknown;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  fields: Array<{
    id: string;
    modelDefinitionId: string;
    fieldKey: string;
    appField: string;
    expectedType: string;
    required: boolean;
    description: string;
    defaultNotionField: string | null;
    builtinField: string | null;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
  binding: { dataSourceId: string } | null;
}): NotionModelDefinition {
  return {
    id: row.id,
    modelKey: row.modelKey,
    label: row.label,
    defaultDisplayName: row.defaultDisplayName,
    schemaSource: row.schemaSource,
    projectionKind: row.projectionKind as NotionModelProjectionKind,
    projectionConfigJson: isPlainObject(row.projectionConfigJson)
      ? row.projectionConfigJson
      : {},
    isActive: row.isActive,
    fields: row.fields.map(toDomainField),
    dataSourceId: row.binding?.dataSourceId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toDomainField(row: {
  id: string;
  modelDefinitionId: string;
  fieldKey: string;
  appField: string;
  expectedType: string;
  required: boolean;
  description: string;
  defaultNotionField: string | null;
  builtinField: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}): NotionModelField {
  return {
    id: row.id,
    modelDefinitionId: row.modelDefinitionId,
    fieldKey: row.fieldKey,
    appField: row.appField,
    expectedType: row.expectedType as NotionModelFieldType,
    required: row.required,
    description: row.description,
    defaultNotionField: row.defaultNotionField,
    builtinField: row.builtinField as NotionModelField["builtinField"],
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
