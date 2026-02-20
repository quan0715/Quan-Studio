import type { ReactNode } from "react";
import { ResilientNotionImage } from "@/presentation/features/notion-sync/resilient-notion-image";
import { cn, toAnchorSafeId } from "@/presentation/lib/utils";
import { extractNotionFileLikeUrl, richTextToPlain } from "@/domain/notion/notion-property-readers";
import { isPlainObject } from "@/shared/utils/type-guards";

type PostContentRendererProps = {
  document?: Record<string, unknown> | null;
  notionPageId?: string | null;
  className?: string;
  emptyText?: string;
};

type RichTextItem = {
  type?: string;
  plain_text?: string;
  href?: string | null;
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
    code?: boolean;
    color?: string;
  };
};

type NotionBlock = {
  id?: string;
  type?: string;
  [key: string]: unknown;
};

function asRichText(value: unknown): RichTextItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isPlainObject) as RichTextItem[];
}

function asNotionBlocks(value: unknown): NotionBlock[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isPlainObject) as NotionBlock[];
}

function normalizeDocumentSnapshot(
  document: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!document) {
    return null;
  }

  try {
    const snapshot = JSON.parse(JSON.stringify(document)) as unknown;
    return isPlainObject(snapshot) ? snapshot : null;
  } catch {
    return document;
  }
}

function toNotionBlocks(document: Record<string, unknown> | null | undefined): NotionBlock[] {
  if (!document) {
    return [];
  }

  if (Array.isArray(document.results)) {
    return asNotionBlocks(document.results);
  }

  if (Array.isArray(document.blocks)) {
    return asNotionBlocks(document.blocks);
  }

  if (Array.isArray(document.children)) {
    return asNotionBlocks(document.children);
  }

  return [];
}

function extractNotionBlockData(block: NotionBlock): Record<string, unknown> {
  const blockType = block.type;
  if (!blockType || !isPlainObject(block[blockType])) {
    return {};
  }

  return block[blockType] as Record<string, unknown>;
}



function applyNotionAnnotations(text: ReactNode, item: RichTextItem): ReactNode {
  let content = text;
  const annotations = item.annotations;

  if (!annotations) {
    return content;
  }

  if (annotations.bold) {
    content = <strong>{content}</strong>;
  }
  if (annotations.italic) {
    content = <em>{content}</em>;
  }
  if (annotations.underline) {
    content = <u>{content}</u>;
  }
  if (annotations.strikethrough) {
    content = <s>{content}</s>;
  }

  const isCode = Boolean(annotations.code);
  if (annotations.code) {
    content = (
      <code className="inline-block rounded-md border border-border/70 bg-muted px-1.5 py-0.5 font-mono text-[11px] leading-none text-red-500 dark:text-red-400">
        {content}
      </code>
    );
  }

  if (isCode) {
    return content;
  }

  const color = annotations.color;
  if (typeof color === "string" && color !== "default") {
    if (color.endsWith("_background")) {
      content = <span className="rounded-none bg-muted px-1 py-0.5">{content}</span>;
    } else {
      content = <span className="text-primary">{content}</span>;
    }
  }

  return content;
}

function renderNotionRichText(items: RichTextItem[], prefix: string): ReactNode {
  if (!items.length) {
    return null;
  }

  return items.map((item, index) => {
    const key = `${prefix}-rt-${index}`;
    const plainText = item.plain_text ?? "";
    const annotated = applyNotionAnnotations(
      <span className="whitespace-pre-wrap">{plainText}</span>,
      item
    );

    if (item.href) {
      return (
        <a
          key={key}
          href={item.href}
          target="_blank"
          rel="noreferrer noopener"
          className="text-primary underline underline-offset-4"
        >
          {annotated}
        </a>
      );
    }

    return <span key={key}>{annotated}</span>;
  });
}

function renderChildrenBlocks(
  data: Record<string, unknown>,
  prefix: string,
  notionPageId?: string | null
): ReactNode {
  const children = asNotionBlocks(data.children);
  if (!children.length) {
    return null;
  }

  return (
    <div className="mt-2 space-y-2 border-l border-border/60 pl-4">
      {renderNotionBlocks(children, `${prefix}-child`, notionPageId)}
    </div>
  );
}

function renderEmbeddedChildrenBlocks(
  data: Record<string, unknown>,
  prefix: string,
  notionPageId?: string | null
): ReactNode {
  const children = asNotionBlocks(data.children);
  if (!children.length) {
    return null;
  }

  return <div className="space-y-2">{renderNotionBlocks(children, `${prefix}-child`, notionPageId)}</div>;
}

function renderMediaCaption(data: Record<string, unknown>, key: string): ReactNode {
  const caption = richTextToPlain(asRichText(data.caption));
  if (!caption) {
    return null;
  }

  return <figcaption className="text-xs text-muted-foreground" key={`${key}-caption`}>{caption}</figcaption>;
}

function renderUrlCard(key: string, label: string, url: string): ReactNode {
  return (
    <div key={key} className="rounded-none border bg-muted/30 px-3 py-2 text-sm">
      <div className="font-medium">{label}</div>
      <a
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        className="break-all text-primary underline underline-offset-4"
      >
        {url}
      </a>
    </div>
  );
}

function renderCalloutIcon(data: Record<string, unknown>, notionPageId?: string | null): ReactNode {
  const rawIcon = data.icon;
  if (!isPlainObject(rawIcon)) {
    return null;
  }

  if (rawIcon.type === "emoji" && typeof rawIcon.emoji === "string") {
    return <span className="text-base leading-none">{rawIcon.emoji}</span>;
  }

  if (rawIcon.type === "custom_emoji" && isPlainObject(rawIcon.custom_emoji)) {
    const customEmojiUrl = rawIcon.custom_emoji.url;
    if (typeof customEmojiUrl === "string" && customEmojiUrl.trim().length > 0) {
      return (
        <ResilientNotionImage
          src={customEmojiUrl}
          alt="Callout icon"
          notionPageId={notionPageId}
          width={20}
          height={20}
          className="h-5 w-5 rounded-none object-cover"
          fallbackClassName="h-5 w-5 rounded-none border-0 p-0 text-[10px]"
          fallbackLabel=""
        />
      );
    }
  }

  const mediaIconUrl = extractNotionFileLikeUrl(rawIcon);
  if (mediaIconUrl) {
    return (
      <ResilientNotionImage
        src={mediaIconUrl}
        alt="Callout icon"
        notionPageId={notionPageId}
        width={20}
        height={20}
        className="h-5 w-5 rounded-none object-cover"
        fallbackClassName="h-5 w-5 rounded-none border-0 p-0 text-[10px]"
        fallbackLabel=""
      />
    );
  }

  return null;
}

function resolveHeadingAnchorId(block: NotionBlock, fallbackKey: string): string {
  const raw = typeof block.id === "string" && block.id.trim().length > 0 ? block.id : fallbackKey;
  return `h-${toAnchorSafeId(raw)}`;
}

const headingSizeMap: Record<string, { tag: "h1" | "h2" | "h3"; className: string }> = {
  heading_1: { tag: "h1", className: "text-2xl" },
  heading_2: { tag: "h2", className: "text-xl" },
  heading_3: { tag: "h3", className: "text-lg" },
};

function renderHeadingBlock(
  type: string,
  key: string,
  anchorId: string,
  richText: ReactNode,
  children: ReactNode
): ReactNode {
  const config = headingSizeMap[type];
  if (!config) {
    return null;
  }
  const Tag = config.tag;
  return (
    <div key={key} className="space-y-2">
      <Tag id={anchorId} className={`scroll-mt-24 font-semibold leading-tight ${config.className}`}>
        {richText}
      </Tag>
      {children}
    </div>
  );
}

function renderMediaFigure(
  data: Record<string, unknown>,
  key: string,
  notionPageId: string | null | undefined
): ReactNode {
  const type = data._blockType as string;
  const src = extractNotionFileLikeUrl(data);
  if (!src) {
    const label = (type ?? "Media").charAt(0).toUpperCase() + (type ?? "media").slice(1);
    return <p key={key} className="text-sm text-muted-foreground">{label} unavailable.</p>;
  }

  let mediaElement: ReactNode;
  switch (type) {
    case "image":
      mediaElement = (
        <ResilientNotionImage
          src={src}
          alt={richTextToPlain(asRichText(data.caption)) || "Notion image"}
          notionPageId={notionPageId}
          width={1600}
          height={900}
          sizes="(max-width: 768px) 100vw, 760px"
          className="h-auto max-h-[520px] w-full rounded-none border object-cover"
          fallbackLabel="Image unavailable"
        />
      );
      break;
    case "video":
      mediaElement = <video controls src={src} className="max-h-[520px] w-full rounded-none border bg-black" />;
      break;
    case "audio":
      mediaElement = <audio controls src={src} className="w-full" />;
      break;
    case "pdf":
      mediaElement = <iframe src={src} title="Notion PDF" className="h-[520px] w-full rounded-none border" />;
      break;
    case "embed":
      mediaElement = (
        <iframe
          src={src}
          title="Notion embed"
          className="aspect-video w-full rounded-none border"
          loading="lazy"
          allowFullScreen
        />
      );
      break;
    default:
      return null;
  }

  return (
    <figure key={key} className="space-y-2">
      {mediaElement}
      {renderMediaCaption(data, key)}
    </figure>
  );
}

function renderUrlCardBlock(
  data: Record<string, unknown>,
  key: string,
  label: string
): ReactNode {
  const url = extractNotionFileLikeUrl(data);
  if (!url) {
    return <p key={key} className="text-sm text-muted-foreground">{label} unavailable.</p>;
  }
  return renderUrlCard(key, label, url);
}

function renderNotionBlock(
  block: NotionBlock,
  key: string,
  notionPageId?: string | null
): ReactNode {
  const type = block.type ?? "unsupported";
  const data = extractNotionBlockData(block);
  const richText = renderNotionRichText(asRichText(data.rich_text), key);
  const children = renderChildrenBlocks(data, key, notionPageId);

  if (type in headingSizeMap) {
    const headingAnchorId = resolveHeadingAnchorId(block, key);
    return renderHeadingBlock(type, key, headingAnchorId, richText, children);
  }

  const mediaTypes = new Set(["image", "video", "audio", "pdf", "embed"]);
  if (mediaTypes.has(type)) {
    return renderMediaFigure({ ...data, _blockType: type }, key, notionPageId);
  }

  switch (type) {
    case "paragraph":
      return (
        <div key={key} className="space-y-2">
          <p className="text-sm leading-7">{richText}</p>
          {children}
        </div>
      );
    case "quote":
      return (
        <div key={key} className="space-y-2">
          <blockquote className="border-l-2 border-primary/50 pl-4 italic text-muted-foreground">
            {richText}
          </blockquote>
          {children}
        </div>
      );
    case "code": {
      const codeText = asRichText(data.rich_text)
        .map((item) => item.plain_text ?? "")
        .join("");
      const language = typeof data.language === "string" ? data.language : "plain text";

      return (
        <div key={key} className="space-y-2">
          <pre className="overflow-x-auto rounded-none border bg-muted/50 p-3 text-xs leading-6">
            <code>{codeText}</code>
          </pre>
          <p className="text-xs text-muted-foreground">{language}</p>
          {children}
        </div>
      );
    }
    case "divider":
      return <hr key={key} className="border-border" />;
    case "to_do": {
      const checked = Boolean(data.checked);
      return (
        <div key={key} className="space-y-2">
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={checked} readOnly className="mt-1 h-3.5 w-3.5 accent-primary" />
            <span className={checked ? "line-through text-muted-foreground" : ""}>{richText}</span>
          </label>
          {children}
        </div>
      );
    }
    case "toggle":
      return (
        <details key={key} className="rounded-none border px-3 py-2 text-sm">
          <summary className="cursor-pointer list-none font-medium">{richText}</summary>
          {children}
        </details>
      );
    case "callout": {
      const calloutChildren = renderEmbeddedChildrenBlocks(data, key, notionPageId);
      const calloutIcon = renderCalloutIcon(data, notionPageId);
      return (
        <aside
          key={key}
          className="flex items-start gap-2 rounded-none border border-border bg-muted/40 px-3 py-2 text-sm"
        >
          {calloutIcon ? <span className="mt-0.5 shrink-0">{calloutIcon}</span> : null}
          <div className="min-w-0 space-y-2">
            <div>{richText}</div>
            {calloutChildren}
          </div>
        </aside>
      );
    }
    case "equation": {
      const expression = typeof data.expression === "string" ? data.expression : "";
      return (
        <div key={key} className="rounded-none border bg-muted/30 px-3 py-2 font-mono text-sm">
          {expression || richText}
        </div>
      );
    }
    case "file":
      return renderUrlCardBlock(data, key, "File");
    case "bookmark":
      return renderUrlCardBlock(data, key, "Bookmark");
    case "link_preview":
      return renderUrlCardBlock(data, key, "Link Preview");
    case "table": {
      const rows = asNotionBlocks(data.children).filter((row) => row.type === "table_row");
      if (!rows.length) {
        return <p key={key} className="text-sm text-muted-foreground">Table has no rows.</p>;
      }

      return (
        <div key={key} className="overflow-x-auto rounded-none border">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {rows.map((row, rowIndex) => {
                const rowData = extractNotionBlockData(row);
                const cells = Array.isArray(rowData.cells) ? rowData.cells : [];
                return (
                  <tr key={row.id ?? `${key}-row-${rowIndex}`} className="border-b last:border-b-0">
                    {cells.map((cell, cellIndex) => (
                      <td key={`${key}-cell-${rowIndex}-${cellIndex}`} className="align-top border-r p-2 last:border-r-0">
                        {renderNotionRichText(asRichText(cell), `${key}-cell-${rowIndex}-${cellIndex}`)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }
    case "table_row": {
      const cells = Array.isArray(data.cells) ? data.cells : [];
      return (
        <div key={key} className="overflow-x-auto rounded-none border">
          <table className="w-full border-collapse text-sm">
            <tbody>
              <tr>
                {cells.map((cell, index) => (
                  <td key={`${key}-${index}`} className="border-r p-2 last:border-r-0">
                    {renderNotionRichText(asRichText(cell), `${key}-${index}`)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      );
    }
    case "column_list": {
      const columns = asNotionBlocks(data.children).filter((child) => child.type === "column");
      if (!columns.length) {
        return <div key={key}>{children}</div>;
      }

      const maxColumns = Math.max(1, columns.length);
      return (
        <div
          key={key}
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${maxColumns}, minmax(0, 1fr))` }}
        >
          {columns.map((column, index) => {
            const columnData = extractNotionBlockData(column);
            const columnChildren = asNotionBlocks(columnData.children);
            return (
              <div key={column.id ?? `${key}-column-${index}`} className="space-y-2 rounded-none border p-3">
                {columnChildren.length
                  ? renderNotionBlocks(columnChildren, `${key}-column-${index}`, notionPageId)
                  : <p className="text-sm text-muted-foreground">Empty column</p>}
              </div>
            );
          })}
        </div>
      );
    }
    case "column": {
      const columnBlocks = asNotionBlocks(data.children);
      if (!columnBlocks.length) {
        return <p key={key} className="text-sm text-muted-foreground">Empty column</p>;
      }
      return (
        <div key={key} className="space-y-2">
          {renderNotionBlocks(columnBlocks, key, notionPageId)}
        </div>
      );
    }
    case "child_page": {
      const title = typeof data.title === "string" ? data.title : "Untitled Page";
      return (
        <div key={key} className="rounded-none border bg-muted/30 px-3 py-2 text-sm">
          <div className="font-medium">Page</div>
          <div>{title}</div>
        </div>
      );
    }
    case "child_database": {
      const title = typeof data.title === "string" ? data.title : "Untitled Database";
      return (
        <div key={key} className="rounded-none border bg-muted/30 px-3 py-2 text-sm">
          <div className="font-medium">Database</div>
          <div>{title}</div>
        </div>
      );
    }
    case "link_to_page": {
      const targetType = typeof data.type === "string" ? data.type : "page_id";
      const targetId =
        (targetType === "page_id" && typeof data.page_id === "string" && data.page_id) ||
        (targetType === "database_id" && typeof data.database_id === "string" && data.database_id) ||
        "unknown";
      return (
        <div key={key} className="rounded-none border bg-muted/30 px-3 py-2 text-sm">
          <div className="font-medium">Link To {targetType === "database_id" ? "Database" : "Page"}</div>
          <div className="font-mono text-xs text-muted-foreground">{targetId}</div>
        </div>
      );
    }
    case "synced_block": {
      const syncedFrom = isPlainObject(data.synced_from) ? data.synced_from.block_id : null;
      return (
        <div key={key} className="space-y-2 rounded-none border bg-muted/20 p-3">
          <p className="text-xs text-muted-foreground">
            {typeof syncedFrom === "string" ? `Synced from: ${syncedFrom}` : "Original synced block"}
          </p>
          {children}
        </div>
      );
    }
    case "template":
      return (
        <div key={key} className="space-y-2 rounded-none border px-3 py-2 text-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Template</p>
          <div>{richText}</div>
          {children}
        </div>
      );
    case "breadcrumb":
      return <p key={key} className="text-xs text-muted-foreground">Breadcrumb</p>;
    case "table_of_contents":
      return <p key={key} className="text-xs text-muted-foreground">Table of contents</p>;
    case "unsupported":
      return <p key={key} className="text-sm text-muted-foreground">Unsupported block type</p>;
    default:
      return (
        <div key={key} className="space-y-2 rounded-none border border-dashed px-3 py-2 text-sm text-muted-foreground">
          <p>Unsupported block type: {type}</p>
          <div>{richText}</div>
          {children}
        </div>
      );
  }
}

function collectListItems(
  blocks: NotionBlock[],
  startIndex: number,
  listType: string,
  prefix: string,
  notionPageId?: string | null
): { items: ReactNode[]; nextIndex: number } {
  const items: ReactNode[] = [];
  let index = startIndex;

  while (index < blocks.length && blocks[index].type === listType) {
    const itemBlock = blocks[index];
    const itemKey = itemBlock.id ?? `${prefix}-${listType}-${index}`;
    const itemData = extractNotionBlockData(itemBlock);
    const itemChildren = renderChildrenBlocks(itemData, itemKey, notionPageId);
    items.push(
      <li key={itemKey} className="ml-1 space-y-2">
        <div>{renderNotionRichText(asRichText(itemData.rich_text), itemKey)}</div>
        {itemChildren}
      </li>
    );
    index += 1;
  }

  return { items, nextIndex: index - 1 };
}

function renderNotionBlocks(
  blocks: NotionBlock[],
  prefix = "block",
  notionPageId?: string | null
): ReactNode[] {
  const nodes: ReactNode[] = [];

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    const key = block.id ?? `${prefix}-${index}`;

    if (block.type === "bulleted_list_item") {
      const { items, nextIndex } = collectListItems(blocks, index, "bulleted_list_item", prefix, notionPageId);
      index = nextIndex;
      nodes.push(
        <ul key={key} className="list-disc list-outside space-y-2 pl-6 text-sm leading-7">
          {items}
        </ul>
      );
      continue;
    }

    if (block.type === "numbered_list_item") {
      const { items, nextIndex } = collectListItems(blocks, index, "numbered_list_item", prefix, notionPageId);
      index = nextIndex;
      nodes.push(
        <ol key={key} className="list-decimal list-outside space-y-2 pl-7 text-sm leading-7">
          {items}
        </ol>
      );
      continue;
    }

    nodes.push(renderNotionBlock(block, key, notionPageId));
  }

  return nodes;
}

export function PostContentRenderer({
  document,
  notionPageId,
  className,
  emptyText = "No content yet.",
}: PostContentRendererProps) {
  const normalizedDocument = normalizeDocumentSnapshot(document);
  const notionBlocks = toNotionBlocks(normalizedDocument);

  if (!notionBlocks.length) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <article className={cn("space-y-4 text-foreground", className)}>
      {renderNotionBlocks(notionBlocks, "block", notionPageId)}
    </article>
  );
}
