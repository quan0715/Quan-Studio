import Image from "next/image";
import { Badge } from "@/presentation/components/ui/badge";
import { Card, CardContent } from "@/presentation/components/ui/card";
import type { ProjectItem } from "@/presentation/types/project";

export function ProjectCard({ item }: { item: ProjectItem }) {
  return (
    <Card className="flex h-full flex-col">
      <CardContent className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center gap-3">
          {item.thumbnail?.emoji ? (
            <span className="text-2xl leading-none">{item.thumbnail.emoji}</span>
          ) : item.thumbnail?.url ? (
            <Image
              src={item.thumbnail.url}
              alt={`${item.name} thumbnail`}
              width={32}
              height={32}
              className="h-8 w-8 rounded object-contain"
            />
          ) : null}
          <h3 className="text-lg font-semibold leading-tight">{item.name}</h3>
        </div>

        {item.description ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
        ) : null}

        {item.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="mt-auto flex gap-2 pt-2">
          {item.githubUrl ? (
            <a
              href={item.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
            >
              GitHub
            </a>
          ) : null}
          {item.demoUrl ? (
            <a
              href={item.demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
            >
              Demo
            </a>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
