export type FieldType =
  | "title"
  | "rich_text"
  | "select"
  | "multi_select"
  | "status"
  | "number"
  | "date"
  | "checkbox"
  | "url"
  | "file"
  | "media"
  | "builtin";

export type TypedFieldValue =
  | string
  | number
  | boolean
  | string[]
  | Array<{ name: string | null; type: "file" | "external" | null; url: string | null }>
  | { start: string | null; end: string | null }
  | { emoji: string | null; url: string | null }
  | null;

export type PublicModelQueryResponse = {
  meta: {
    modelKey: string;
    dataSourceId: string;
    generatedAt: string;
    schemaVersion: number;
  };
  rows: Array<Record<string, TypedFieldValue>>;
};
