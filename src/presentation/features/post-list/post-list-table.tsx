import { Badge } from "@/presentation/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/presentation/components/ui/table";
import { formatIsoToUtcDateTime } from "@/presentation/lib/date-time";
import type { PostListItemDto } from "@/presentation/types/post";

type PostListTableProps = {
  posts: PostListItemDto[];
};

function formatDateLabel(value: string | null) {
  return formatIsoToUtcDateTime(value);
}

export function PostListTable({ posts }: PostListTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Synced Posts</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Synced</TableHead>
              <TableHead>Published</TableHead>
              <TableHead>Page ID</TableHead>
              <TableHead>Sync Error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.map((post) => (
              <TableRow key={post.id}>
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-medium">{post.title}</p>
                    {post.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {post.tags.map((tag) => (
                          <Badge key={`${post.id}-${tag}`} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={post.status === "published" ? "default" : "outline"}>{post.status}</Badge>
                </TableCell>
                <TableCell>{post.slug}</TableCell>
                <TableCell>{formatDateLabel(post.syncedAt)}</TableCell>
                <TableCell>{formatDateLabel(post.publishedAt)}</TableCell>
                <TableCell className="font-mono text-[11px]">{post.notionPageId}</TableCell>
                <TableCell className="max-w-[280px] truncate">{post.syncError ?? "-"}</TableCell>
              </TableRow>
            ))}
            {posts.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">
                  No synced posts yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
