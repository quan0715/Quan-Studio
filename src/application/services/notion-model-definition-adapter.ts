import type { NotionBuiltinSchemaCheck, NotionSchemaFieldExpectation } from "@/domain/notion-models/model-descriptor";
import type { NotionModelDefinition } from "@/domain/notion-model-definition/notion-model-definition";

export function toSchemaMappingFromDefinition(model: NotionModelDefinition): {
  expectations: NotionSchemaFieldExpectation[];
  builtinChecks: NotionBuiltinSchemaCheck[];
} {
  const expectations: NotionSchemaFieldExpectation[] = [];
  const builtinChecks: NotionBuiltinSchemaCheck[] = [];

  for (const field of model.fields) {
    if (field.expectedType === "builtin") {
      builtinChecks.push({
        appField: field.appField,
        description: field.description,
        notionField: field.builtinField ?? "page.icon",
        expectedType: "builtin",
        message: "Uses Notion built-in field.",
      });
      continue;
    }

    expectations.push({
      appField: field.appField,
      notionField: field.defaultNotionField ?? field.fieldKey,
      expectedType: field.expectedType,
      required: field.required,
      description: field.description,
    });
  }

  return { expectations, builtinChecks };
}

