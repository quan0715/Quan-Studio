import {
  NotionModelMapperService,
  toMappedNumber,
  toMappedString,
} from "@/application/services/notion-model-mapper.service";
import type { ProjectionBuilder, ProjectionBuildInput } from "@/application/services/projection-builder-registry";
import { isPlainObject } from "@/shared/utils/type-guards";
import type { NotionFlatListProjectionDescriptor } from "@/domain/notion-models/model-descriptor";

type NotionPageRecord = {
  id?: string;
  object?: string;
  created_time?: string;
  last_edited_time?: string;
  cover?: unknown;
  icon?: unknown;
  properties?: unknown;
  [key: string]: unknown;
};

export class BuildFlatListViewService implements ProjectionBuilder {
  constructor(
    private readonly notionModelMapperService: NotionModelMapperService = new NotionModelMapperService()
  ) {}

  build(input: ProjectionBuildInput): Array<Record<string, unknown>> {
    const projection = input.projection as NotionFlatListProjectionDescriptor;

    const items = input.pages
      .map((page) => this.toItem(page as NotionPageRecord, input, projection))
      .filter((item): item is Record<string, unknown> => item !== null);

    if (projection.sortBy && projection.sortBy.length > 0) {
      items.sort((a, b) => compareBySortSpec(a, b, projection.sortBy!));
    }

    return items;
  }

  private toItem(
    page: NotionPageRecord,
    input: ProjectionBuildInput,
    projection: NotionFlatListProjectionDescriptor
  ): Record<string, unknown> | null {
    if (page.object !== "page") {
      return null;
    }

    const pageId = typeof page.id === "string" ? page.id : "";
    if (!pageId) {
      return null;
    }

    const mappedFields = this.notionModelMapperService.mapPageFields({
      expectations: input.schemaMapping.expectations,
      builtinChecks: input.schemaMapping.builtinChecks ?? [],
      explicitMappings: input.explicitMappings,
      page: {
        created_time: typeof page.created_time === "string" ? page.created_time : "",
        last_edited_time: typeof page.last_edited_time === "string" ? page.last_edited_time : "",
        cover: page.cover,
        icon: page.icon,
        properties: isPlainObject(page.properties) ? page.properties : {},
      },
    });

    const result: Record<string, unknown> = { key: pageId };
    for (const [outputField, appField] of Object.entries(projection.fields)) {
      result[outputField] = mappedFields[appField] ?? null;
    }

    return result;
  }
}

function compareBySortSpec(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
  sortBy: { field: string; direction: "asc" | "desc" }[]
): number {
  for (const spec of sortBy) {
    const av = a[spec.field];
    const bv = b[spec.field];
    const cmp = compareValues(av, bv);
    if (cmp !== 0) {
      return spec.direction === "desc" ? -cmp : cmp;
    }
  }
  return 0;
}

function compareValues(a: unknown, b: unknown): number {
  const an = toMappedNumber(a);
  const bn = toMappedNumber(b);
  if (an !== null && bn !== null) {
    return an - bn;
  }

  const as = toMappedString(a);
  const bs = toMappedString(b);
  if (as !== null && bs !== null) {
    return as.localeCompare(bs);
  }

  // nulls sort last
  if (as === null && bs !== null) return 1;
  if (as !== null && bs === null) return -1;
  if (an === null && bn !== null) return 1;
  if (an !== null && bn === null) return -1;

  return 0;
}
