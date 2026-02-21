import type { NotionSchemaFieldExpectation } from "@/domain/notion-models/model-descriptor";
import type { DataSourceProperty } from "@/application/services/notion-model-mapper.service";

export type SchemaDiffAction =
  | { kind: "add"; fieldName: string; fieldType: string }
  | { kind: "rename"; fromName: string; toName: string }
  | { kind: "delete"; fieldName: string }
  | { kind: "type_change"; fieldName: string; fromType: string; toType: string };

export function computeSchemaDiff(input: {
  expectations: NotionSchemaFieldExpectation[];
  currentProperties: DataSourceProperty[];
  explicitMappings: Record<string, string>;
}): SchemaDiffAction[] {
  const { expectations, currentProperties, explicitMappings } = input;
  const actions: SchemaDiffAction[] = [];

  const currentByName = new Map(currentProperties.map((p) => [p.name, p]));
  const currentNames = new Set(currentProperties.map((p) => p.name));
  const referencedNames = new Set<string>();
  const titlePropertyName = currentProperties.find((p) => p.type === "title")?.name;

  for (const expectation of expectations) {
    if (expectation.expectedType === "builtin") {
      continue;
    }

    const explicitTarget = explicitMappings[expectation.appField];
    const targetField = explicitTarget ?? expectation.notionField;

    if (currentNames.has(targetField)) {
      referencedNames.add(targetField);
      const currentProp = currentByName.get(targetField)!;
      const expectedNotionType = toNotionPropertyType(expectation.expectedType);
      if (expectedNotionType && currentProp.type !== expectedNotionType) {
        actions.push({
          kind: "type_change",
          fieldName: targetField,
          fromType: currentProp.type,
          toType: expectedNotionType,
        });
      }
      continue;
    }

    if (explicitTarget && !currentNames.has(explicitTarget) && currentNames.has(expectation.notionField)) {
      actions.push({ kind: "rename", fromName: expectation.notionField, toName: explicitTarget });
      referencedNames.add(expectation.notionField);
      continue;
    }

    const schema = toNotionPropertySchema(expectation.expectedType);
    if (schema) {
      actions.push({ kind: "add", fieldName: targetField, fieldType: expectation.expectedType });
    }
  }

  for (const property of currentProperties) {
    if (property.name === titlePropertyName) {
      continue;
    }
    if (!referencedNames.has(property.name)) {
      const isReferenced = expectations.some((exp) => {
        if (exp.expectedType === "builtin") return false;
        const target = explicitMappings[exp.appField] ?? exp.notionField;
        return target === property.name;
      });
      if (!isReferenced) {
        actions.push({ kind: "delete", fieldName: property.name });
      }
    }
  }

  return actions;
}

export function toNotionPropertySchema(expectedType: string): Record<string, unknown> | null {
  switch (expectedType) {
    case "title":
      return { title: {} };
    case "rich_text":
      return { rich_text: {} };
    case "number":
      return { number: {} };
    case "select":
      return { select: {} };
    case "multi_select":
      return { multi_select: {} };
    case "date":
      return { date: {} };
    case "checkbox":
      return { checkbox: {} };
    case "url":
      return { url: {} };
    case "file":
    case "media":
      return { files: {} };
    case "email":
      return { email: {} };
    case "phone_number":
      return { phone_number: {} };
    case "status":
      return { status: {} };
    case "builtin":
      return null;
    default:
      return null;
  }
}

export function toNotionPropertyType(expectedType: string): string | null {
  switch (expectedType) {
    case "file":
    case "media":
      return "files";
    case "builtin":
      return null;
    default:
      return expectedType;
  }
}

export function buildMigrationPayload(actions: SchemaDiffAction[]): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const action of actions) {
    switch (action.kind) {
      case "add": {
        const schema = toNotionPropertySchema(action.fieldType);
        const notionType = toNotionPropertyType(action.fieldType);
        if (schema && notionType) {
          payload[action.fieldName] = { type: notionType, ...schema };
        }
        break;
      }
      case "rename":
        payload[action.fromName] = { name: action.toName };
        break;
      case "type_change": {
        const changeSchema = toNotionPropertySchema(action.toType);
        if (changeSchema) {
          payload[action.fieldName] = { type: action.toType, ...changeSchema };
        }
        break;
      }
      case "delete":
        payload[action.fieldName] = null;
        break;
    }
  }

  return payload;
}
