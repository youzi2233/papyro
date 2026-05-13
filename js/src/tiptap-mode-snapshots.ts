import {
  normalizeTiptapViewMode,
  type TiptapViewMode,
} from "./tiptap-mode-controller.ts";

type SelectionSnapshot = Readonly<{
  from: number;
  to: number;
}>;
type ModeSnapshot = Readonly<{
  mode: TiptapViewMode;
  selection: SelectionSnapshot;
  markdownRevision: number;
}>;
type EditorSelectionLike = {
  from?: unknown;
  to?: unknown;
};
type TiptapEditorLike = {
  state?: {
    selection?: EditorSelectionLike;
  };
  commands?: {
    focus?: () => void;
    setTextSelection?: (selection: SelectionSnapshot) => boolean | void;
  };
};
type SourceTextareaLike = {
  value?: string;
  selectionStart?: unknown;
  selectionEnd?: unknown;
  setSelectionRange?: (start: number, end: number) => void;
  focus?: () => void;
};
type SourcePaneLike = {
  textarea?: SourceTextareaLike | null;
};
type ModeSnapshotEntry = {
  viewMode?: unknown;
  editor?: TiptapEditorLike | null;
  sourcePane?: SourcePaneLike | null;
  markdownSync?: {
    markdown?: string | null;
  } | null;
};

function safePosition(value: unknown) {
  const position = Number(value);
  return Number.isSafeInteger(position) && position >= 0 ? position : null;
}

function editorSelectionSnapshot(editor: TiptapEditorLike | null | undefined) {
  const selection = editor?.state?.selection;
  const from = safePosition(selection?.from);
  const to = safePosition(selection?.to);
  if (from === null || to === null) return null;

  return {
    from,
    to,
  };
}

function sourceSelectionSnapshot(sourcePane: SourcePaneLike | null | undefined) {
  const textarea = sourcePane?.textarea;
  if (!textarea) return null;

  const valueLength = String(textarea.value ?? "").length;
  const from = safePosition(textarea.selectionStart);
  const to = safePosition(textarea.selectionEnd);
  if (from === null || to === null) return null;

  return {
    from: Math.min(from, valueLength),
    to: Math.min(to, valueLength),
  };
}

function restoreEditorSelection(
  editor: TiptapEditorLike | null | undefined,
  selection: SelectionSnapshot | null | undefined,
) {
  if (!editor || !selection) return false;

  const from = safePosition(selection.from);
  const to = safePosition(selection.to);
  if (from === null || to === null) return false;

  const selected =
    typeof editor.commands?.setTextSelection === "function" &&
    editor.commands.setTextSelection({ from, to }) !== false;
  if (!selected) return false;

  editor.commands?.focus?.();
  return true;
}

function restoreSourceSelection(
  sourcePane: SourcePaneLike | null | undefined,
  selection: SelectionSnapshot | null | undefined,
) {
  const textarea = sourcePane?.textarea;
  if (!textarea || !selection) return false;

  const valueLength = String(textarea.value ?? "").length;
  const from = Math.min(safePosition(selection.from) ?? valueLength, valueLength);
  const to = Math.min(safePosition(selection.to) ?? from, valueLength);
  textarea.setSelectionRange?.(from, to);
  textarea.focus?.();
  return true;
}

function markdownRevision(entry: ModeSnapshotEntry | null | undefined) {
  return entry?.markdownSync?.markdown?.length ?? 0;
}

export class TiptapModeSnapshotController {
  #snapshots = new Map<TiptapViewMode, ModeSnapshot>();

  get snapshots() {
    return new Map(
      Array.from(this.#snapshots.entries()).map(([mode, snapshot]) => [
        mode,
        {
          ...snapshot,
          selection: { ...snapshot.selection },
        },
      ]),
    );
  }

  capture(entry: ModeSnapshotEntry | null | undefined, mode: unknown = entry?.viewMode) {
    const normalizedMode = normalizeTiptapViewMode(mode);
    const selection =
      normalizedMode === "source"
        ? sourceSelectionSnapshot(entry?.sourcePane)
        : editorSelectionSnapshot(entry?.editor);

    if (!selection) return null;

    const snapshot = {
      mode: normalizedMode,
      selection,
      markdownRevision: markdownRevision(entry),
    };
    this.#snapshots.set(normalizedMode, snapshot);
    return { ...snapshot, selection: { ...selection } };
  }

  restore(entry: ModeSnapshotEntry | null | undefined, mode: unknown = entry?.viewMode) {
    const normalizedMode = normalizeTiptapViewMode(mode);
    const snapshot = this.#snapshots.get(normalizedMode);
    if (!snapshot) return false;
    if (snapshot.markdownRevision !== markdownRevision(entry)) return false;

    if (normalizedMode === "source") {
      return restoreSourceSelection(entry?.sourcePane, snapshot.selection);
    }

    if (normalizedMode === "hybrid") {
      return restoreEditorSelection(entry?.editor, snapshot.selection);
    }

    return false;
  }

  clear() {
    this.#snapshots.clear();
  }
}

export function createTiptapModeSnapshotController() {
  return new TiptapModeSnapshotController();
}
