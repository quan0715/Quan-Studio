import { Badge } from "@/presentation/components/ui/badge";
import { Card, CardContent } from "@/presentation/components/ui/card";
import { ProjectCard } from "@/presentation/features/project/project-card";
import { serverApiRequest } from "@/presentation/lib/server-api-client";
import type { ProjectResponse } from "@/presentation/types/project";

export default async function ProjectsPage() {
  const response = await serverApiRequest<ProjectResponse>("/api/public/projects?limit=100");

  if (!response.ok) {
    return (
      <section className="space-y-8">
        <Card>
          <CardContent className="p-6 md:p-8">
            <Badge variant="destructive" className="w-fit">
              Projects API Error
            </Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">無法載入 Projects 資料</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {response.error.code}: {response.error.message}
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  const items = response.data.items;

  return (
    <section className="space-y-8">
      {items.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground md:p-8">
            目前沒有可顯示的 Project 資料。
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ProjectCard key={item.key} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
