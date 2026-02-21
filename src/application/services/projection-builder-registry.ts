import type {
  NotionModelProjectionDescriptor,
  NotionModelSchemaMappingDescriptor,
} from "@/domain/notion-models/model-descriptor";

export type ProjectionBuildInput = {
  pages: Array<Record<string, unknown>>;
  schemaMapping: NotionModelSchemaMappingDescriptor;
  projection: NotionModelProjectionDescriptor;
  explicitMappings: Record<string, string>;
};

export type ProjectionBuilder = {
  build(input: ProjectionBuildInput): unknown;
};

const registry = new Map<string, ProjectionBuilder>();

export function registerProjectionBuilder(kind: string, builder: ProjectionBuilder): void {
  registry.set(kind, builder);
}

export function getProjectionBuilder(kind: string): ProjectionBuilder | null {
  return registry.get(kind) ?? null;
}
