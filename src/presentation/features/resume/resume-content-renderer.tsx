import type { ReactNode } from "react";
import { cn } from "@/presentation/lib/utils";
import { isPlainObject } from "@/shared/utils/type-guards";

type ResumeContentRendererProps = {
  blocks?: Array<Record<string, unknown>> | null;
  className?: string;
  emptyText?: string;
};

type NotionBlock = {
  id?: string;
  type?: string;
  [key: string]: unknown;
};

type RichTextItem = {
  plain_text?: string;
  href?: string | null;
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
    code?: boolean;
  };
};

function asBlocks(value: unknown): NotionBlock[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isPlainObject) as NotionBlock[];
}

function asRichText(value: unknown): RichTextItem[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isPlainObject) as RichTextItem[];
}

function extractBlockData(block: NotionBlock): Record<string, unknown> {
  const blockType = block.type;
  if (!blockType || !isPlainObject(block[blockType])) {
    return {};
  }
  return block[blockType] as Record<string, unknown>;
}

function applyAnnotations(text: ReactNode, item: RichTextItem): ReactNode {
  const annotations = item.annotations;
  if (!annotations) {
    return text;
  }

  let content = text;
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
  if (annotations.code) {
    content = (
      <code className="rounded border border-neutral-300 bg-neutral-100 px-1 py-0.5 font-mono text-[0.92em]">
        {content}
      </code>
    );
  }
  return content;
}

function renderRichText(items: RichTextItem[], prefix: string): ReactNode {
  if (!items.length) {
    return null;
  }

  return items.map((item, index) => {
    const key = `${prefix}-rt-${index}`;
    const plainText = item.plain_text ?? "";
    const content = applyAnnotations(<span className="whitespace-pre-wrap">{plainText}</span>, item);

    if (item.href) {
      return (
        <a key={key} href={item.href} target="_blank" rel="noreferrer noopener" className="underline">
          {content}
        </a>
      );
    }

    return <span key={key}>{content}</span>;
  });
}

function renderChildren(data: Record<string, unknown>, key: string): ReactNode {
  const children = asBlocks(data.children);
  if (!children.length) {
    return null;
  }
  return <div className="mt-1 space-y-1.5">{renderBlocks(children, `${key}-child`)}</div>;
}

function renderBlock(block: NotionBlock, key: string): ReactNode {
  const type = block.type;
  const data = extractBlockData(block);
  const richText = renderRichText(asRichText(data.rich_text), key);
  const children = renderChildren(data, key);

  switch (type) {
    case "paragraph":
      return (
        <p key={key} className="leading-[1.55]">
          {richText}
          {children}
        </p>
      );
    case "heading_1":
    case "heading_2":
    case "heading_3":
      return (
        <p key={key} className="font-semibold leading-[1.5]">
          {richText}
          {children}
        </p>
      );
    case "quote":
      return (
        <blockquote key={key} className="border-l border-neutral-300 pl-3 italic leading-[1.55]">
          {richText}
          {children}
        </blockquote>
      );
    case "callout":
      return (
        <p key={key} className="leading-[1.55]">
          {richText}
          {children}
        </p>
      );
    case "divider":
      return <hr key={key} className="border-neutral-200" />;
    default:
      return (
        <div key={key} className="leading-[1.55]">
          {richText}
          {children}
        </div>
      );
  }
}

function collectListItems(
  blocks: NotionBlock[],
  startIndex: number,
  listType: "bulleted_list_item" | "numbered_list_item",
  prefix: string
): { items: ReactNode[]; nextIndex: number } {
  const items: ReactNode[] = [];
  let index = startIndex;

  while (index < blocks.length && blocks[index].type === listType) {
    const item = blocks[index];
    const key = item.id ?? `${prefix}-${listType}-${index}`;
    const data = extractBlockData(item);
    const children = renderChildren(data, key);
    items.push(
      <li key={key} className="space-y-1">
        <div className="leading-[1.55]">{renderRichText(asRichText(data.rich_text), key)}</div>
        {children}
      </li>
    );
    index += 1;
  }

  return { items, nextIndex: index - 1 };
}

function renderBlocks(blocks: NotionBlock[], prefix = "resume-block"): ReactNode[] {
  const nodes: ReactNode[] = [];

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    const key = block.id ?? `${prefix}-${index}`;

    if (block.type === "bulleted_list_item") {
      const { items, nextIndex } = collectListItems(blocks, index, "bulleted_list_item", prefix);
      index = nextIndex;
      nodes.push(
        <ul key={key} className="list-disc space-y-1 pl-5">
          {items}
        </ul>
      );
      continue;
    }

    if (block.type === "numbered_list_item") {
      const { items, nextIndex } = collectListItems(blocks, index, "numbered_list_item", prefix);
      index = nextIndex;
      nodes.push(
        <ol key={key} className="list-decimal space-y-1 pl-5">
          {items}
        </ol>
      );
      continue;
    }

    nodes.push(renderBlock(block, key));
  }

  return nodes;
}

export function ResumeContentRenderer({
  blocks,
  className,
  emptyText = "",
}: ResumeContentRendererProps) {
  const notionBlocks = asBlocks(blocks);
  if (!notionBlocks.length) {
    return emptyText ? <p className="text-inherit">{emptyText}</p> : null;
  }

  return <article className={cn("space-y-1.5 text-inherit", className)}>{renderBlocks(notionBlocks)}</article>;
}
