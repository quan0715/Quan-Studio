import { AppError } from "@/application/errors";
import {
  isNotionBuiltinField,
  isNotionModelFieldType,
  type NotionModelFieldType,
} from "@/domain/notion-model-definition/notion-model-definition";

const MODEL_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;
const FIELD_KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*$/;

export function normalizeModelKey(input: string): string {
  const value = input.trim();
  if (!MODEL_KEY_PATTERN.test(value)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "modelKey must match /^[a-z][a-z0-9_]*$/"
    );
  }
  return value;
}

export function validateFieldType(expectedType: string): NotionModelFieldType {
  if (!isNotionModelFieldType(expectedType)) {
    throw new AppError("VALIDATION_ERROR", `unsupported expectedType: ${expectedType}`);
  }
  return expectedType;
}

export function normalizeFieldKey(input: string): string {
  const value = input.trim();
  if (!FIELD_KEY_PATTERN.test(value)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "fieldKey must match /^[a-zA-Z][a-zA-Z0-9_]*$/"
    );
  }
  return value;
}

export function normalizeAppField(modelKey: string, appField: string): string {
  const value = appField.trim();
  const prefix = `${modelKey}.`;
  if (!value.startsWith(prefix)) {
    throw new AppError(
      "VALIDATION_ERROR",
      `appField must start with model prefix: ${prefix}`
    );
  }

  const localField = value.slice(prefix.length);
  if (!FIELD_KEY_PATTERN.test(localField)) {
    throw new AppError(
      "VALIDATION_ERROR",
      `appField suffix must match /^[a-zA-Z][a-zA-Z0-9_]*$/`
    );
  }
  return value;
}

export function normalizeBuiltinField(input: string | null): string | null {
  if (input === null) {
    return null;
  }
  const value = input.trim();
  if (!value) {
    return null;
  }
  if (!isNotionBuiltinField(value)) {
    throw new AppError("VALIDATION_ERROR", `unsupported builtinField: ${value}`);
  }
  return value;
}

