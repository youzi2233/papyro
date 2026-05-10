import {
  applyTableCellVisualState,
  clearTableCellVisualState,
} from "../tiptap-table-chrome-model.js";
import { setHidden } from "../tiptap-ui-primitives.js";

function canUseChromeBridge(root) {
  return Boolean(root && root.ownerDocument && typeof root.nodeType === "number");
}

export class TiptapReactTableChromeRenderer {
  #root = null;
  #lastTable = null;

  constructor({ root = null } = {}) {
    if (canUseChromeBridge(root)) {
      this.#root = root;
    }
  }

  get enabled() {
    return Boolean(this.#root);
  }

  render(state) {
    if (!this.#root) return false;
    if (this.#lastTable && this.#lastTable !== state?.table) {
      clearTableCellVisualState(this.#lastTable);
    }
    if (state?.table) {
      applyTableCellVisualState(state);
    }
    this.#lastTable = state?.table ?? null;
    setHidden(this.#root, true, { visibilityAttributes: true, inertFocus: true });
    if (this.#root.dataset) {
      this.#root.dataset.open = state?.open ? "true" : "false";
      this.#root.dataset.selectionKind = state?.selection?.kind ?? "cell";
      this.#root.dataset.renderer = "visual-state-bridge";
    }
    return true;
  }

  hide() {
    if (this.#lastTable) {
      clearTableCellVisualState(this.#lastTable);
      this.#lastTable = null;
    }
    setHidden(this.#root, true, { visibilityAttributes: true, inertFocus: true });
    if (this.#root?.dataset) {
      this.#root.dataset.open = "false";
    }
  }

  contains(target) {
    return this.#root?.contains?.(target) ?? false;
  }

  destroy() {
    this.hide();
    this.#root = null;
  }
}

export function createTiptapReactTableChromeRenderer(options) {
  const renderer = new TiptapReactTableChromeRenderer(options);
  return renderer.enabled ? renderer : null;
}
