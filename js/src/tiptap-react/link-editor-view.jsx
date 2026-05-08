import React from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

import { setHidden } from "../tiptap-ui-primitives.js";
import { PapyroLinkEditor } from "./components/link-editor.jsx";
import {
  positionReactFloatingElement,
  usableFloatingRect,
} from "./utils/floating.js";

const LINK_EDITOR_WIDTH = 260;
const LINK_EDITOR_HEIGHT = 128;
const LINK_EDITOR_MARGIN = 10;

function selectionRect(editor, range) {
  const view = editor?.view;
  if (!view || typeof view.coordsAtPos !== "function" || !range) return null;

  try {
    const from = view.coordsAtPos(range.from);
    const to = view.coordsAtPos(range.to);
    const rect = {
      left: Math.min(from.left, to.left),
      right: Math.max(from.right ?? from.left, to.right ?? to.left),
      top: Math.min(from.top, to.top),
      bottom: Math.max(from.bottom ?? from.top, to.bottom ?? to.top),
    };
    return usableFloatingRect(rect) ? rect : null;
  } catch (_error) {
    return null;
  }
}

function placeLinkEditor(element, editor, state, fallbackWindow) {
  positionReactFloatingElement({
    element,
    rect: selectionRect(editor, state.range),
    reference: editor?.view?.dom,
    fallbackWindow,
    size: {
      width: LINK_EDITOR_WIDTH,
      height: LINK_EDITOR_HEIGHT,
      margin: LINK_EDITOR_MARGIN,
    },
    placement: "bottom",
  });
}

export class TiptapReactLinkEditorView {
  #document;
  #window;
  #ownerId;
  #root = null;
  #reactRoot = null;

  constructor({
    document = typeof globalThis.document === "undefined" ? null : globalThis.document,
    window = document?.defaultView ?? (typeof globalThis.window === "undefined" ? null : globalThis.window),
    ownerId = "mn-tiptap-link-editor",
  } = {}) {
    this.#document = document;
    this.#window = window;
    this.#ownerId = ownerId;
  }

  mount(container) {
    if (this.#root || !this.#document) return;

    const root = this.#document.createElement?.("div") ?? null;
    if (!root) return;

    root.id = this.#ownerId;
    root.className = "mn-tiptap-link-editor hidden";
    root.role = "dialog";
    (container?.ownerDocument?.body ?? this.#document.body)?.appendChild(root);

    this.#root = root;
    this.#reactRoot = createRoot(root);
    setHidden(root, true);
  }

  update(state, editor) {
    if (!this.#root || !this.#reactRoot || !state?.open) return;

    this.#root.setAttribute("aria-label", state.labels?.title ?? "Edit link");
    flushSync(() => {
      this.#reactRoot.render(<PapyroLinkEditor state={state} />);
    });

    setHidden(this.#root, false);
    placeLinkEditor(this.#root, editor, state, this.#window);
  }

  hide() {
    setHidden(this.#root, true);
  }

  contains(target) {
    return this.#root?.contains?.(target) ?? false;
  }

  destroy() {
    this.#reactRoot?.unmount?.();
    this.#root?.remove?.();
    this.#reactRoot = null;
    this.#root = null;
  }
}

export function createTiptapReactLinkEditorView(options) {
  return new TiptapReactLinkEditorView(options);
}
