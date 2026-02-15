import type { IntegrationConfigKey } from "@/domain/integration-config/integration-config";

export type NotionModelSchemaSource = string | null;

export type NotionSchemaFieldExpectation = {
  appField: string;
  notionField: string;
  expectedType: string;
  required: boolean;
  description: string;
};

export type NotionBuiltinSchemaCheck = {
  appField: string;
  description: string;
  notionField: string;
  expectedType: "builtin";
  message: string;
};

export type NotionModelSchemaMappingDescriptor = {
  expectations: NotionSchemaFieldExpectation[];
  builtinChecks?: NotionBuiltinSchemaCheck[];
};

export type NotionModelDescriptor = {
  id: string;
  label: string;
  defaultDisplayName: string;
  dataSourceConfigKey: IntegrationConfigKey;
  schemaSource: NotionModelSchemaSource;
  schemaMapping?: NotionModelSchemaMappingDescriptor;
};

export function defineNotionModel<T extends NotionModelDescriptor>(descriptor: T): T {
  if (!descriptor.id.trim()) {
    throw new Error("notion model id is required");
  }
  if (!descriptor.label.trim()) {
    throw new Error(`notion model ${descriptor.id} label is required`);
  }
  if (!descriptor.defaultDisplayName.trim()) {
    throw new Error(`notion model ${descriptor.id} defaultDisplayName is required`);
  }

  if (descriptor.schemaSource !== null && !descriptor.schemaSource.trim()) {
    throw new Error(`notion model ${descriptor.id} schemaSource must be non-empty`);
  }

  if (descriptor.schemaSource && !descriptor.schemaMapping) {
    throw new Error(
      `notion model ${descriptor.id} schemaMapping is required when schemaSource is configured`
    );
  }

  if (!descriptor.schemaSource && descriptor.schemaMapping) {
    throw new Error(
      `notion model ${descriptor.id} cannot define schemaMapping without schemaSource`
    );
  }

  if (descriptor.schemaMapping) {
    for (const field of descriptor.schemaMapping.expectations) {
      if (!field.appField.trim()) {
        throw new Error(`notion model ${descriptor.id} contains empty schema appField`);
      }
      if (!field.notionField.trim()) {
        throw new Error(
          `notion model ${descriptor.id} contains empty schema notionField for ${field.appField}`
        );
      }
      if (!field.expectedType.trim()) {
        throw new Error(
          `notion model ${descriptor.id} contains empty expectedType for ${field.appField}`
        );
      }
      if (!field.description.trim()) {
        throw new Error(
          `notion model ${descriptor.id} contains empty description for ${field.appField}`
        );
      }
    }

    for (const field of descriptor.schemaMapping.builtinChecks ?? []) {
      if (!field.appField.trim()) {
        throw new Error(`notion model ${descriptor.id} contains empty builtin appField`);
      }
      if (!field.notionField.trim()) {
        throw new Error(
          `notion model ${descriptor.id} contains empty builtin notionField for ${field.appField}`
        );
      }
      if (!field.description.trim()) {
        throw new Error(
          `notion model ${descriptor.id} contains empty builtin description for ${field.appField}`
        );
      }
      if (!field.message.trim()) {
        throw new Error(
          `notion model ${descriptor.id} contains empty builtin message for ${field.appField}`
        );
      }
    }
  }

  return descriptor;
}
