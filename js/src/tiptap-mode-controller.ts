export type TiptapViewMode = "source" | "hybrid" | "preview";
export type TiptapViewModeContract = Readonly<{
  mode: TiptapViewMode;
  richTextEditable: boolean;
  sourcePaneVisible: boolean;
  rustPreviewVisible: boolean;
}>;

type TiptapModeEntry = {
  viewMode?: TiptapViewMode;
  dom?: {
    dataset?: Record<string, string>;
  };
  editor?: {
    setEditable?: (editable: boolean) => void;
  };
};

export const TIPTAP_VIEW_MODE_CONTRACT: Readonly<Record<TiptapViewMode, TiptapViewModeContract>> = Object.freeze({
  source: Object.freeze({
    mode: "source",
    richTextEditable: false,
    sourcePaneVisible: true,
    rustPreviewVisible: false,
  }),
  hybrid: Object.freeze({
    mode: "hybrid",
    richTextEditable: true,
    sourcePaneVisible: false,
    rustPreviewVisible: false,
  }),
  preview: Object.freeze({
    mode: "preview",
    richTextEditable: false,
    sourcePaneVisible: false,
    rustPreviewVisible: true,
  }),
});

export function normalizeTiptapViewMode(mode: unknown): TiptapViewMode {
  if (typeof mode !== "string") return "hybrid";
  const normalized = mode.trim().toLowerCase();
  return normalized === "source" || normalized === "hybrid" || normalized === "preview"
    ? normalized
    : "hybrid";
}

export function tiptapViewModeContract(mode: unknown) {
  return TIPTAP_VIEW_MODE_CONTRACT[normalizeTiptapViewMode(mode)];
}

export function tiptapModeAllowsRichTextEditing(mode: unknown) {
  return tiptapViewModeContract(mode).richTextEditable;
}

export function tiptapModeUsesSourcePane(mode: unknown) {
  return tiptapViewModeContract(mode).sourcePaneVisible;
}

export function tiptapModeUsesRustPreview(mode: unknown) {
  return tiptapViewModeContract(mode).rustPreviewVisible;
}

export class TiptapModeController {
  #mode: TiptapViewMode;

  constructor(initialMode: unknown = "hybrid") {
    this.#mode = normalizeTiptapViewMode(initialMode);
  }

  get mode() {
    return this.#mode;
  }

  apply(entry: TiptapModeEntry | null | undefined, nextMode: unknown = this.#mode) {
    const mode = normalizeTiptapViewMode(nextMode);
    const contract = tiptapViewModeContract(mode);
    this.#mode = mode;

    if (entry) {
      entry.viewMode = mode;
      if (entry.dom?.dataset) {
        entry.dom.dataset.viewMode = mode;
      }
      entry.editor?.setEditable?.(contract.richTextEditable);
    }

    return mode;
  }
}

export function createTiptapModeController(initialMode?: unknown) {
  return new TiptapModeController(initialMode);
}
