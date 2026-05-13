import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import type { Selection, Transaction } from "@tiptap/pm/state";

type ResolvedPosLike = {
  depth: number;
  parent?: {
    childCount?: number;
    child?: (index: number) => ProseMirrorNode | null;
    canReplaceWith?: (
      from: number,
      to: number,
      nodeType: ProseMirrorNode["type"],
    ) => boolean;
  } | null;
  index?: (depth?: number) => number;
};

type DocLike = ProseMirrorNode & {
  resolve?: (pos: number) => ResolvedPosLike;
  nodeAt?: (pos: number) => ProseMirrorNode | null;
};

type EditorStateLike = {
  doc?: DocLike | null;
  tr?: Transaction;
};

type TiptapBlockMoveEditor = {
  state?: EditorStateLike | null;
  view?: {
    dispatch?: (transaction: Transaction) => void;
  } | null;
  commands?: {
    focus?: () => unknown;
    setNodeSelection?: (pos: number) => unknown;
    setTextSelection?: (pos: number) => unknown;
  } | null;
};

export type TiptapBlockTarget = {
  pos?: number | null;
  node?: ProseMirrorNode | null;
  block?: {
    pmViewDesc?: {
      node?: ProseMirrorNode | null;
    } | null;
  } | null;
  kind?: string;
};

export type TiptapBlockDrop = {
  pos?: number | null;
  placement?: "before" | "after";
};

export type TiptapBlockMove = {
  tr: Transaction;
  pos: number;
  selection: Selection | null;
};

export function targetEndPos(target?: TiptapBlockTarget | null): number | null {
  const nodeSize = target?.node?.nodeSize ?? target?.block?.pmViewDesc?.node?.nodeSize ?? 0;
  return Number.isFinite(target?.pos) ? target.pos + Math.max(1, nodeSize) : null;
}

function targetNode(
  editor?: TiptapBlockMoveEditor | null,
  target?: TiptapBlockTarget | null,
): ProseMirrorNode | null {
  const from = target?.pos;
  return target?.node ?? (Number.isFinite(from) ? editor?.state?.doc?.nodeAt?.(from) : null);
}

function resolvedTargetPosition(
  editor?: TiptapBlockMoveEditor | null,
  target?: TiptapBlockTarget | null,
): ResolvedPosLike | null {
  const from = target?.pos;
  const doc = editor?.state?.doc;
  if (!Number.isFinite(from) || typeof doc?.resolve !== "function") {
    return null;
  }

  try {
    return doc.resolve(from);
  } catch (_error) {
    return null;
  }
}

export function blockSiblingDrop(
  editor: TiptapBlockMoveEditor | null | undefined,
  target: TiptapBlockTarget | null | undefined,
  direction: "up" | "down" | string,
): TiptapBlockDrop | null {
  const from = target?.pos;
  const node = targetNode(editor, target);
  const resolved = resolvedTargetPosition(editor, target);
  const parent = resolved?.parent;
  const index =
    typeof resolved?.index === "function"
      ? resolved.index(resolved.depth)
      : null;
  const siblingDirection = direction === "up" ? -1 : direction === "down" ? 1 : 0;

  if (
    !Number.isFinite(from) ||
    !node ||
    !parent ||
    !Number.isInteger(index) ||
    siblingDirection === 0
  ) {
    return null;
  }

  const childCount = Number(parent.childCount);
  if (!Number.isFinite(childCount) || childCount <= 1) {
    return null;
  }

  if (siblingDirection < 0) {
    if (index <= 0 || typeof parent.child !== "function") return null;
    const previousNode = parent.child(index - 1);
    const previousSize = Number(previousNode?.nodeSize);
    if (!Number.isFinite(previousSize) || previousSize <= 0) return null;
    const previousPos = from - previousSize;
    return Number.isFinite(previousPos) && previousPos >= 0
      ? { pos: previousPos, placement: "before" }
      : null;
  }

  if (index >= childCount - 1 || typeof parent.child !== "function") return null;
  const currentSize = Math.max(1, Number(node.nodeSize) || 0);
  const nextNode = parent.child(index + 1);
  const nextSize = Number(nextNode?.nodeSize);
  if (!Number.isFinite(nextSize) || nextSize <= 0) return null;
  const nextEndPos = from + currentSize + nextSize;
  return Number.isFinite(nextEndPos) ? { pos: nextEndPos, placement: "after" } : null;
}

export function canMoveTiptapBlock(
  editor: TiptapBlockMoveEditor | null | undefined,
  target: TiptapBlockTarget | null | undefined,
  direction: "up" | "down" | string,
): boolean {
  return blockSiblingDrop(editor, target, direction) !== null;
}

function blockMoveSelection(
  doc: DocLike | null | undefined,
  node: ProseMirrorNode | null | undefined,
  pos: number | null | undefined,
): Selection | null {
  if (!doc || !node || !Number.isFinite(pos)) {
    return null;
  }

  try {
    if (NodeSelection.isSelectable(node)) {
      return NodeSelection.create(doc, pos as number);
    }

    const resolved = doc.resolve(pos as number);
    return TextSelection.near(resolved, 1);
  } catch (_error) {
    return null;
  }
}

export function createTiptapBlockMove(
  editor: TiptapBlockMoveEditor | null | undefined,
  source: TiptapBlockTarget | null | undefined,
  drop: TiptapBlockDrop | null | undefined,
): TiptapBlockMove | null {
  const state = editor?.state;
  const doc = state?.doc;
  const from = source?.pos;
  const node = targetNode(editor, source);
  const nodeSize = node?.nodeSize ?? 0;
  const to = Number.isFinite(from) ? from + Math.max(1, nodeSize) : null;
  const dropPos = drop?.pos;

  if (
    !state?.tr ||
    !doc ||
    !node ||
    !Number.isFinite(from) ||
    !Number.isFinite(to) ||
    !Number.isFinite(dropPos) ||
    to <= from
  ) {
    return null;
  }

  if (dropPos >= from && dropPos <= to) {
    return null;
  }

  const insertPos = dropPos > to ? dropPos - (to - from) : dropPos;
  if (!Number.isFinite(insertPos) || insertPos < 0) {
    return null;
  }

  try {
    let tr = state.tr.delete(from, to);
    const resolved = tr.doc?.resolve?.(insertPos);
    if (
      node.type &&
      typeof resolved?.parent?.canReplaceWith === "function" &&
      resolved.parent.canReplaceWith(resolved.index(), resolved.index(), node.type) === false
    ) {
      return null;
    }

    tr = tr.insert(insertPos, node);
    const selection = blockMoveSelection(tr.doc, node, insertPos);
    if (selection && typeof tr.setSelection === "function") {
      tr = tr.setSelection(selection);
    }
    tr = typeof tr.scrollIntoView === "function" ? tr.scrollIntoView() : tr;
    return { tr, pos: insertPos, selection };
  } catch (_error) {
    return null;
  }
}

export function moveTiptapBlock(
  editor: TiptapBlockMoveEditor | null | undefined,
  source: TiptapBlockTarget | null | undefined,
  drop: TiptapBlockDrop | null | undefined,
): boolean {
  const move = createTiptapBlockMove(editor, source, drop);
  if (!move) return false;

  editor?.view?.dispatch?.(move.tr);
  if (!move.selection) {
    if (typeof editor?.commands?.setNodeSelection === "function") {
      editor.commands.setNodeSelection(move.pos);
    } else {
      editor?.commands?.setTextSelection?.(move.pos);
    }
  }
  editor?.commands?.focus?.();
  return true;
}
