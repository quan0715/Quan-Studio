import { Badge } from "@/presentation/components/ui/badge";
import { Card, CardContent } from "@/presentation/components/ui/card";
import { NotionSettingsPanel } from "@/presentation/features/studio-settings/notion-settings-panel";
import { serverApiRequest } from "@/presentation/lib/server-api-client";
import type { NotionModelSettingsDto } from "@/presentation/types/studio-settings";

export default async function StudioNotionSettingsPage() {
  const response = await serverApiRequest<NotionModelSettingsDto>("/api/studio/settings/notion/models");

  if (!response.ok) {
    return (
      <section className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Notion Settings</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <Badge variant="destructive">Settings API Error</Badge>
            <p className="mt-2 text-sm text-muted-foreground">
              {response.error.code}: {response.error.message}
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Notion Settings</h1>
        <p className="text-muted-foreground text-xs">
          Scan source page databases and map built-in model templates to source data IDs.
        </p>
      </div>
      <NotionSettingsPanel initialSettings={response.data} />
    </section>
  );
}
