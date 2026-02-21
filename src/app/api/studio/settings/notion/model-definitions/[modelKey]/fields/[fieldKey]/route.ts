import { jsonSuccess } from "@/interface/http/api-response";
import { getContainer } from "@/interface/container";
import { handleApiRequest } from "@/interface/http/handler";
import { parseStudioModelFieldPayload } from "@/interface/http/validators";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ modelKey: string; fieldKey: string }> }
): Promise<Response> {
  return handleApiRequest(request, async () => {
    const container = getContainer();
    const { modelKey, fieldKey } = await context.params;
    const payload = await parseStudioModelFieldPayload(request);
    await container.updateNotionModelFieldUseCase.execute({
      modelKey,
      fieldKey,
      nextFieldKey: payload.fieldKey,
      appField: payload.appField,
      expectedType: payload.expectedType,
      required: payload.required,
      description: payload.description,
      defaultNotionField: payload.defaultNotionField,
      builtinField: payload.builtinField,
      sortOrder: payload.sortOrder,
    });
    const result = await container.listNotionModelDefinitionsUseCase.execute();
    return jsonSuccess(result);
  });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ modelKey: string; fieldKey: string }> }
): Promise<Response> {
  return handleApiRequest(request, async () => {
    const container = getContainer();
    const { modelKey, fieldKey } = await context.params;
    await container.deleteNotionModelFieldUseCase.execute(modelKey, fieldKey);
    const result = await container.listNotionModelDefinitionsUseCase.execute();
    return jsonSuccess(result);
  });
}
