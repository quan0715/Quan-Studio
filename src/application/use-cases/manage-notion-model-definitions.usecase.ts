import { AppError } from "@/application/errors";
import {
  normalizeAppField,
  normalizeBuiltinField,
  normalizeFieldKey,
  normalizeModelKey,
  validateFieldType,
} from "@/application/services/notion-model-definition-validator";
import type {
  NotionModelDefinitionRepository,
} from "@/domain/notion-model-definition/notion-model-definition-repository";
import type { NotionModelDefinition, NotionModelProjectionKind } from "@/domain/notion-model-definition/notion-model-definition";

export type NotionModelDefinitionOutput = {
  modelKey: string;
  label: string;
  defaultDisplayName: string;
  schemaSource: string;
  projectionKind: NotionModelProjectionKind;
  projectionConfigJson: Record<string, unknown>;
  isActive: boolean;
  dataSourceId: string | null;
  fields: Array<{
    fieldKey: string;
    appField: string;
    expectedType: string;
    required: boolean;
    description: string;
    defaultNotionField: string | null;
    builtinField: string | null;
    sortOrder: number;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type ListNotionModelDefinitionsOutput = {
  generatedAt: string;
  models: NotionModelDefinitionOutput[];
};

type CreateModelInput = {
  modelKey: string;
  label: string;
  defaultDisplayName: string;
  schemaSource?: string;
  projectionKind?: NotionModelProjectionKind;
  projectionConfigJson?: Record<string, unknown>;
};

type UpdateModelInput = {
  modelKey: string;
  label?: string;
  defaultDisplayName?: string;
  schemaSource?: string;
  projectionKind?: NotionModelProjectionKind;
  projectionConfigJson?: Record<string, unknown>;
  isActive?: boolean;
};

type AddFieldInput = {
  modelKey: string;
  fieldKey: string;
  appField: string;
  expectedType: string;
  required?: boolean;
  description?: string;
  defaultNotionField?: string | null;
  builtinField?: string | null;
  sortOrder?: number;
};

type UpdateFieldInput = {
  modelKey: string;
  fieldKey: string;
  nextFieldKey?: string;
  appField?: string;
  expectedType?: string;
  required?: boolean;
  description?: string;
  defaultNotionField?: string | null;
  builtinField?: string | null;
  sortOrder?: number;
};

export class ListNotionModelDefinitionsUseCase {
  constructor(private readonly repository: NotionModelDefinitionRepository) {}

  async execute(): Promise<ListNotionModelDefinitionsOutput> {
    const models = await this.repository.listAll();
    return {
      generatedAt: new Date().toISOString(),
      models: models.map(toOutput),
    };
  }
}

export class CreateNotionModelDefinitionUseCase {
  constructor(private readonly repository: NotionModelDefinitionRepository) {}

  async execute(input: CreateModelInput): Promise<NotionModelDefinitionOutput> {
    const modelKey = normalizeModelKey(input.modelKey);
    const label = input.label.trim();
    const defaultDisplayName = input.defaultDisplayName.trim();
    if (!label || !defaultDisplayName) {
      throw new AppError("VALIDATION_ERROR", "label and defaultDisplayName are required");
    }

    const schemaSource = input.schemaSource?.trim() || modelKey;
    const projectionKind = input.projectionKind ?? "flat_list";
    const created = await this.repository.createDefinition({
      modelKey,
      label,
      defaultDisplayName,
      schemaSource,
      projectionKind,
      projectionConfigJson: input.projectionConfigJson ?? {},
      isActive: true,
    });
    return toOutput(created);
  }
}

export class UpdateNotionModelDefinitionUseCase {
  constructor(private readonly repository: NotionModelDefinitionRepository) {}

  async execute(input: UpdateModelInput): Promise<NotionModelDefinitionOutput> {
    const modelKey = normalizeModelKey(input.modelKey);
    const updated = await this.repository.updateDefinition({
      modelKey,
      ...(input.label === undefined ? {} : { label: input.label.trim() }),
      ...(input.defaultDisplayName === undefined
        ? {}
        : { defaultDisplayName: input.defaultDisplayName.trim() }),
      ...(input.schemaSource === undefined ? {} : { schemaSource: input.schemaSource.trim() }),
      ...(input.projectionKind === undefined ? {} : { projectionKind: input.projectionKind }),
      ...(input.projectionConfigJson === undefined
        ? {}
        : { projectionConfigJson: input.projectionConfigJson }),
      ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
    });
    return toOutput(updated);
  }
}

export class AddNotionModelFieldUseCase {
  constructor(private readonly repository: NotionModelDefinitionRepository) {}

  async execute(input: AddFieldInput): Promise<void> {
    const model = await this.repository.findByModelKey(normalizeModelKey(input.modelKey));
    if (!model) {
      throw new AppError("VALIDATION_ERROR", `unknown model: ${input.modelKey}`);
    }

    const fieldKey = normalizeFieldKey(input.fieldKey);
    const appField = normalizeAppField(model.modelKey, input.appField);
    const expectedType = validateFieldType(input.expectedType);
    const defaultNotionField = input.defaultNotionField?.trim() || null;
    const builtinField = normalizeBuiltinField(input.builtinField ?? null);
    const sortOrder = input.sortOrder ?? model.fields.length;

    if (expectedType === "builtin" && !builtinField) {
      throw new AppError("VALIDATION_ERROR", "builtin field type requires builtinField");
    }

    if (expectedType !== "builtin" && !defaultNotionField) {
      throw new AppError("VALIDATION_ERROR", "defaultNotionField is required for non-builtin field");
    }

    await this.repository.addField({
      modelKey: model.modelKey,
      fieldKey,
      appField,
      expectedType,
      required: input.required ?? false,
      description: input.description?.trim() || "",
      defaultNotionField,
      builtinField,
      sortOrder,
    });
  }
}

export class UpdateNotionModelFieldUseCase {
  constructor(private readonly repository: NotionModelDefinitionRepository) {}

  async execute(input: UpdateFieldInput): Promise<void> {
    const model = await this.repository.findByModelKey(normalizeModelKey(input.modelKey));
    if (!model) {
      throw new AppError("VALIDATION_ERROR", `unknown model: ${input.modelKey}`);
    }

    const expectedType = input.expectedType ? validateFieldType(input.expectedType) : undefined;
    const builtinField = input.builtinField === undefined
      ? undefined
      : normalizeBuiltinField(input.builtinField);

    await this.repository.updateField({
      modelKey: model.modelKey,
      fieldKey: normalizeFieldKey(input.fieldKey),
      ...(input.nextFieldKey === undefined ? {} : { nextFieldKey: normalizeFieldKey(input.nextFieldKey) }),
      ...(input.appField === undefined
        ? {}
        : { appField: normalizeAppField(model.modelKey, input.appField) }),
      ...(expectedType === undefined ? {} : { expectedType }),
      ...(input.required === undefined ? {} : { required: input.required }),
      ...(input.description === undefined ? {} : { description: input.description.trim() }),
      ...(input.defaultNotionField === undefined
        ? {}
        : { defaultNotionField: input.defaultNotionField?.trim() || null }),
      ...(builtinField === undefined ? {} : { builtinField }),
      ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder }),
    });
  }
}

export class DeleteNotionModelFieldUseCase {
  constructor(private readonly repository: NotionModelDefinitionRepository) {}

  async execute(modelKey: string, fieldKey: string): Promise<void> {
    await this.repository.deleteField(normalizeModelKey(modelKey), normalizeFieldKey(fieldKey));
  }
}

function toOutput(model: NotionModelDefinition): NotionModelDefinitionOutput {
  return {
    modelKey: model.modelKey,
    label: model.label,
    defaultDisplayName: model.defaultDisplayName,
    schemaSource: model.schemaSource,
    projectionKind: model.projectionKind,
    projectionConfigJson: model.projectionConfigJson,
    isActive: model.isActive,
    dataSourceId: model.dataSourceId,
    fields: model.fields.map((field) => ({
      fieldKey: field.fieldKey,
      appField: field.appField,
      expectedType: field.expectedType,
      required: field.required,
      description: field.description,
      defaultNotionField: field.defaultNotionField,
      builtinField: field.builtinField,
      sortOrder: field.sortOrder,
    })),
    createdAt: model.createdAt.toISOString(),
    updatedAt: model.updatedAt.toISOString(),
  };
}

