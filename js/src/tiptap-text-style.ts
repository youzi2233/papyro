import { Highlight } from "@tiptap/extension-highlight";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import type {
  Extension as TiptapExtension,
  JSONContent,
  MarkdownRendererHelpers,
} from "@tiptap/core";
import type { MarkType, Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";

export type PapyroTextStyleOption = Readonly<{
  id: string;
  title: string;
  description: string;
  color: string | null;
}>;

type BlockTextRange = Readonly<{
  from: number;
  to: number;
}>;

type TiptapTextStyleTarget = {
  pos?: unknown;
  node?: ProseMirrorNode | PapyroNodeLike | null;
};

type PapyroNodeLike = {
  isText?: boolean;
  isTextblock?: boolean;
  nodeSize?: number;
  text?: string;
  type?: string | {
    name?: string;
    spec?: {
      content?: string;
    };
  };
  content?: {
    size?: number;
  };
};

type TiptapTextStyleDoc = {
  nodeAt?: (pos: number) => ProseMirrorNode | PapyroNodeLike | null;
  nodesBetween?: (
    from: number,
    to: number,
    callback: (node: ProseMirrorNode | PapyroNodeLike, pos: number) => boolean | void,
  ) => void;
};

type TiptapTextStyleEditor = {
  commands?: {
    focus?: () => unknown;
  };
  state?: {
    doc?: TiptapTextStyleDoc | null;
    schema?: {
      marks?: Record<string, MarkType | undefined>;
    };
    tr?: Transaction;
  };
  view?: {
    dispatch?: (tr: Transaction) => unknown;
  };
};

type TextStyleMarkdownNode = JSONContent & {
  attrs?: {
    color?: string | null;
    backgroundColor?: string | null;
    [key: string]: unknown;
  };
};

export const PAPYRO_TEXT_COLOR_OPTIONS: readonly PapyroTextStyleOption[] = Object.freeze([
  Object.freeze({
    id: "ink",
    title: "Default text",
    description: "Use the current editor text color",
    color: null,
  }),
  Object.freeze({
    id: "muted",
    title: "Muted text",
    description: "De-emphasize supporting content",
    color: "var(--mn-ink-3)",
  }),
  Object.freeze({
    id: "accent",
    title: "Accent text",
    description: "Draw attention without changing structure",
    color: "var(--mn-accent)",
  }),
  Object.freeze({
    id: "danger",
    title: "Danger text",
    description: "Mark risk, warning, or destructive content",
    color: "var(--mn-danger)",
  }),
]);

export const PAPYRO_HIGHLIGHT_OPTIONS: readonly PapyroTextStyleOption[] = Object.freeze([
  Object.freeze({
    id: "clear",
    title: "Clear highlight",
    description: "Remove highlight from this block",
    color: null,
  }),
  Object.freeze({
    id: "yellow",
    title: "Yellow highlight",
    description: "Soft review marker",
    color: "rgba(245, 158, 11, 0.2)",
  }),
  Object.freeze({
    id: "blue",
    title: "Blue highlight",
    description: "Reference or information marker",
    color: "rgba(59, 130, 246, 0.18)",
  }),
  Object.freeze({
    id: "green",
    title: "Green highlight",
    description: "Accepted or positive marker",
    color: "rgba(16, 185, 129, 0.18)",
  }),
]);

function isTextNode(
  node: ProseMirrorNode | PapyroNodeLike | null | undefined,
): boolean {
  return node?.isText === true || node?.type?.name === "text" || node?.type === "text";
}

function isTextblockNode(
  node: ProseMirrorNode | PapyroNodeLike | null | undefined,
): boolean {
  return node?.isTextblock === true || node?.type?.spec?.content === "inline*" || false;
}

function nodeSize(node: ProseMirrorNode | PapyroNodeLike | null | undefined): number {
  return Math.max(0, Number(node?.nodeSize ?? node?.text?.length ?? 0));
}

export function blockTextRanges(
  editor: TiptapTextStyleEditor | null | undefined,
  target: TiptapTextStyleTarget | null | undefined,
): BlockTextRange[] {
  const doc = editor?.state?.doc;
  const from = Number(target?.pos);
  const node = target?.node ?? (Number.isFinite(from) ? doc?.nodeAt?.(from) : null);
  const targetNodeSize = node?.nodeSize ?? 0;
  const to = Number.isFinite(from) ? from + Math.max(1, targetNodeSize) : null;
  if (!doc || !Number.isFinite(from) || !Number.isFinite(to) || to <= from) {
    return [];
  }

  const ranges: BlockTextRange[] = [];
  const addRange = (rangeFrom: number, rangeTo: number) => {
    if (Number.isFinite(rangeFrom) && Number.isFinite(rangeTo) && rangeTo > rangeFrom) {
      ranges.push({ from: rangeFrom, to: rangeTo });
    }
  };

  if (isTextNode(node)) {
    addRange(from, to);
    return ranges;
  }

  doc.nodesBetween(from, to, (child, pos) => {
    if (isTextNode(child)) {
      addRange(pos, pos + nodeSize(child));
      return false;
    }

    if (isTextblockNode(child) && child.content?.size === 0) {
      addRange(pos + 1, pos + 1);
      return false;
    }

    return true;
  });

  return ranges;
}

export function applyMarkToBlockText(
  editor: TiptapTextStyleEditor | null | undefined,
  target: TiptapTextStyleTarget | null | undefined,
  markName: string,
  attrs: Record<string, unknown> | null = null,
): boolean {
  const state = editor?.state;
  const ranges = blockTextRanges(editor, target);
  const markType = state?.schema?.marks?.[markName];
  if (!state?.tr || !markType || ranges.length === 0) return false;

  let tr = state.tr;
  ranges.forEach(({ from, to }) => {
    tr = attrs ? tr.addMark(from, to, markType.create(attrs)) : tr.removeMark(from, to, markType);
  });
  editor?.view?.dispatch?.(tr);
  editor?.commands?.focus?.();
  return true;
}

function styleDeclaration(attrs: TextStyleMarkdownNode["attrs"] = {}): string {
  const declarations: string[] = [];
  if (attrs.color) declarations.push(`color: ${attrs.color}`);
  if (attrs.backgroundColor) declarations.push(`background-color: ${attrs.backgroundColor}`);
  return declarations.join("; ");
}

export const PapyroTextStyle = TextStyle.extend({
  renderMarkdown: (node: JSONContent, helpers: MarkdownRendererHelpers) => {
    const style = styleDeclaration((node as TextStyleMarkdownNode).attrs);
    const content = helpers.renderChildren(node);
    return style ? `<span style="${style}">${content}</span>` : content;
  },
});

export function createPapyroTextStyleExtensions(): TiptapExtension[] {
  return [
    PapyroTextStyle,
    Color.configure({ types: ["textStyle"] }),
    Highlight.configure({ multicolor: true }),
  ];
}
