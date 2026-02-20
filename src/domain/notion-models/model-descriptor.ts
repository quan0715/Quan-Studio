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

export type NotionResumeGroupedProjectionDescriptor = {
  kind: "resume_grouped";
  fields: {
    sectionTitle: string;
    groupTitle: string;
    entryTitle: string;
    summaryText: string;
    periodDateRange: string;
    tags: string;
    sectionOrder: string;
    groupOrder: string;
    itemOrder: string;
    visibility: string;
    logo: string;
  };
  visibility: {
    privateValue: string;
  };
  defaults: {
    sectionTitle: string;
    groupTitle: string;
    entryTitle: string;
    maxOrder: number;
  };
  sectionOrderFallback: Record<string, number>;
  period: {
    presentLabel: string;
  };
};

export type NotionModelProjectionDescriptor = NotionResumeGroupedProjectionDescriptor;

export type NotionModelDescriptor = {
  id: string;
  label: string;
  defaultDisplayName: string;
  dataSourceConfigKey: IntegrationConfigKey;
  schemaSource: NotionModelSchemaSource;
  schemaMapping?: NotionModelSchemaMappingDescriptor;
  projection?: NotionModelProjectionDescriptor;
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

  if (descriptor.projection && !descriptor.schemaMapping) {
    throw new Error(
      `notion model ${descriptor.id} cannot define projection without schemaMapping`
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

  if (descriptor.projection?.kind === "resume_grouped") {
    const {
      fields,
      visibility,
      defaults,
      sectionOrderFallback,
      period,
    } = descriptor.projection;
    const fieldValues = Object.values(fields);

    for (const value of fieldValues) {
      if (!value.trim()) {
        throw new Error(`notion model ${descriptor.id} projection fields must be non-empty`);
      }
    }

    if (!visibility.privateValue.trim()) {
      throw new Error(`notion model ${descriptor.id} projection visibility.privateValue is required`);
    }
    if (!defaults.sectionTitle.trim() || !defaults.groupTitle.trim() || !defaults.entryTitle.trim()) {
      throw new Error(`notion model ${descriptor.id} projection defaults titles are required`);
    }
    if (!Number.isFinite(defaults.maxOrder) || defaults.maxOrder < 0) {
      throw new Error(`notion model ${descriptor.id} projection defaults.maxOrder must be a valid number`);
    }
    if (!period.presentLabel.trim()) {
      throw new Error(`notion model ${descriptor.id} projection period.presentLabel is required`);
    }

    for (const [key, order] of Object.entries(sectionOrderFallback)) {
      if (!key.trim()) {
        throw new Error(`notion model ${descriptor.id} projection sectionOrderFallback key is empty`);
      }
      if (!Number.isFinite(order)) {
        throw new Error(
          `notion model ${descriptor.id} projection sectionOrderFallback value must be numeric`
        );
      }
    }

    const schemaMapping = descriptor.schemaMapping;
    if (!schemaMapping) {
      throw new Error(`notion model ${descriptor.id} projection requires schemaMapping`);
    }

    const allowedAppFields = new Set([
      ...schemaMapping.expectations.map((field) => field.appField),
      ...(schemaMapping.builtinChecks ?? []).map((field) => field.appField),
    ]);

    for (const appField of fieldValues) {
      if (!allowedAppFields.has(appField)) {
        throw new Error(
          `notion model ${descriptor.id} projection field references unknown appField: ${appField}`
        );
      }
    }
  }

  return descriptor;
}
