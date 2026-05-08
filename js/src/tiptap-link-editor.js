import {
  createElement,
  createFloatingDismissController,
  defaultDocument,
  defaultWindow,
  mountFloatingRoot,
  positionFloatingElement,
  setHidden,
  viewportSize,
} from "./tiptap-ui-primitives.js";
import {
  linkEditorApplyLabel,
  linkEditorCloseLabel,
  linkEditorInputLabel,
  linkEditorInvalidLabel,
  linkEditorPlaceholder,
  linkEditorRemoveLabel,
  linkEditorTitleLabel,
} from "./tiptap-i18n.js";

const LINK_EDITOR_WIDTH = 260;
const LINK_EDITOR_HEIGHT = 128;

function languageFromEntry(entry) {
  return entry?.preferences?.language ?? "english";
}

function normalizeHref(value) {
  return String(value ?? "").trim();
}

function linkAttributes(editor) {
  return editor?.getAttributes?.("link") ?? {};
}

function currentSelectionRange(editor) {
  const selection = editor?.state?.selection ?? editor?.view?.state?.selection;
  if (!selection || typeof selection.from !== "number" || typeof selection.to !== "number") {
    return null;
  }

  return {
    from: selection.from,
    to: selection.to,
  };
}

function selectionRect(editor, range) {
  const view = editor?.view;
  if (!view || typeof view.coordsAtPos !== "function" || !range) return null;

  try {
    const from = view.coordsAtPos(range.from);
    const to = view.coordsAtPos(range.to);
    return {
      left: Math.min(from.left, to.left),
      right: Math.max(from.right ?? from.left, to.right ?? to.left),
      top: Math.min(from.top, to.top),
      bottom: Math.max(from.bottom ?? from.top, to.bottom ?? to.top),
    };
  } catch (_error) {
    return null;
  }
}

function placeLinkEditor(element, editor, range, fallbackWindow) {
  const rect = selectionRect(editor, range);
  if (!element || !rect) return;

  positionFloatingElement(element, rect, {
    viewport: viewportSize(editor?.view?.dom, fallbackWindow),
    size: {
      width: LINK_EDITOR_WIDTH,
      height: LINK_EDITOR_HEIGHT,
      margin: 10,
    },
    placement: "bottom",
  });
}

function linkEditorLabels(language) {
  return {
    title: linkEditorTitleLabel(language),
    input: linkEditorInputLabel(language),
    placeholder: linkEditorPlaceholder(language),
    apply: linkEditorApplyLabel(language),
    remove: linkEditorRemoveLabel(language),
    close: linkEditorCloseLabel(language),
    invalid: linkEditorInvalidLabel(language),
  };
}

class TiptapLinkEditorView {
  #document;
  #window;
  #root = null;
  #form = null;
  #input = null;
  #error = null;
  #apply = null;
  #remove = null;
  #close = null;

  constructor({ document = defaultDocument(), window = defaultWindow(document) } = {}) {
    this.#document = document;
    this.#window = window;
  }

  mount(container) {
    if (this.#root || !this.#document) return;

    const root = createElement(this.#document, "div", "mn-tiptap-link-editor hidden");
    const title = createElement(this.#document, "div", "mn-tiptap-link-editor-title");
    const form = createElement(this.#document, "form", "mn-tiptap-link-editor-form");
    const input = createElement(this.#document, "input", "mn-tiptap-link-editor-input");
    const error = createElement(this.#document, "div", "mn-tiptap-link-editor-error hidden");
    const actions = createElement(this.#document, "div", "mn-tiptap-link-editor-actions");
    const remove = createElement(this.#document, "button", "mn-tiptap-link-editor-button subtle");
    const apply = createElement(this.#document, "button", "mn-tiptap-link-editor-button primary");
    const close = createElement(this.#document, "button", "mn-tiptap-link-editor-close");
    if (!root || !title || !form || !input || !error || !actions || !remove || !apply || !close) {
      return;
    }

    root.role = "dialog";
    input.type = "text";
    input.inputMode = "url";
    input.spellcheck = false;
    remove.type = "button";
    apply.type = "submit";
    close.type = "button";

    form.append(input, error, actions);
    actions.append(remove, apply);
    root.append(title, form, close);
    mountFloatingRoot(root, container, this.#document);

    this.#root = root;
    this.#form = form;
    this.#input = input;
    this.#error = error;
    this.#apply = apply;
    this.#remove = remove;
    this.#close = close;
    setHidden(root, true);
  }

  update(state, editor) {
    if (!this.#root || !this.#form || !this.#input || !state.open) return;

    const labels = state.labels ?? linkEditorLabels(state.language);
    this.#root.setAttribute("aria-label", labels.title);
    this.#root.querySelector?.(".mn-tiptap-link-editor-title")?.replaceChildren(labels.title);
    this.#input.value = state.href ?? "";
    this.#input.setAttribute("aria-label", labels.input);
    this.#input.placeholder = labels.placeholder;
    this.#error.textContent = state.error ?? "";
    setHidden(this.#error, !state.error);
    this.#apply.textContent = labels.apply;
    this.#remove.textContent = labels.remove;
    this.#close.setAttribute("aria-label", labels.close);

    this.#form.onsubmit = (event) => {
      event.preventDefault();
      state.apply(this.#input.value);
    };
    this.#remove.onclick = (event) => {
      event.preventDefault();
      state.remove();
    };
    this.#close.onclick = (event) => {
      event.preventDefault();
      state.close();
    };

    setHidden(this.#root, false);
    placeLinkEditor(this.#root, editor, state.range, this.#window);
    this.#input.focus?.();
    this.#input.select?.();
  }

  hide() {
    setHidden(this.#root, true);
  }

  contains(target) {
    return this.#root?.contains?.(target) ?? false;
  }

  destroy() {
    this.#root?.remove?.();
    this.#root = null;
    this.#form = null;
    this.#input = null;
    this.#error = null;
    this.#apply = null;
    this.#remove = null;
    this.#close = null;
  }
}

export class TiptapLinkEditorController {
  #view;
  #dismiss;
  #editor = null;
  #entry = null;
  #state = {
    open: false,
    href: "",
    error: "",
    language: "english",
    range: null,
  };

  constructor({ view = null, dom = {} } = {}) {
    const documentRef = dom.document ?? defaultDocument();
    const windowRef = dom.window ?? defaultWindow(documentRef);
    this.#view = view ?? new TiptapLinkEditorView({ document: documentRef, window: windowRef });
    this.#dismiss = createFloatingDismissController({
      document: documentRef,
      window: windowRef,
      contains: (target) => this.contains(target),
      onDismiss: () => this.close(),
    });
  }

  get state() {
    return {
      ...this.#state,
      range: this.#state.range ? { ...this.#state.range } : null,
    };
  }

  attach({ editor, root, entry } = {}) {
    this.#editor = editor ?? null;
    this.#entry = entry ?? null;
    this.#view.mount?.(root);
  }

  openFromEditor({ editor = this.#editor, entry = this.#entry } = {}) {
    if (!editor || !entry || entry.viewMode !== "hybrid") return false;

    const initialRange = currentSelectionRange(editor);
    if (!initialRange) return false;

    if (initialRange.from === initialRange.to && editor.isActive?.("link")) {
      editor.commands?.extendMarkRange?.("link");
    }

    return this.open({
      editor,
      entry,
      range: currentSelectionRange(editor) ?? initialRange,
    });
  }

  open({ editor = this.#editor, entry = this.#entry, range = null } = {}) {
    if (!editor || !entry || entry.viewMode !== "hybrid" || !range) return false;

    this.#editor = editor;
    this.#entry = entry;
    const language = languageFromEntry(entry);
    this.#state = {
      open: true,
      href: linkAttributes(editor).href ?? "",
      error: "",
      language,
      range: { ...range },
    };
    this.#view.update?.(
      {
        ...this.state,
        labels: linkEditorLabels(language),
        apply: (href) => this.apply(href),
        remove: () => this.remove(),
        close: () => this.close(),
      },
      editor,
    );
    this.#dismiss.open();
    return true;
  }

  apply(value) {
    if (!this.#editor || !this.#state.open) return false;
    const href = normalizeHref(value);
    const ok = href ? this.#setLink(href) : this.remove();
    if (!ok && href) {
      this.#state = { ...this.#state, href, error: linkEditorInvalidLabel(this.#state.language) };
      this.#view.update?.(
        {
          ...this.state,
          labels: linkEditorLabels(this.#state.language),
          apply: (nextHref) => this.apply(nextHref),
          remove: () => this.remove(),
          close: () => this.close(),
        },
        this.#editor,
      );
    }
    return ok;
  }

  remove() {
    if (!this.#editor || !this.#state.open) return false;
    this.#restoreSelection();
    const ok = this.#editor.commands?.unsetLink?.() !== false;
    if (ok) this.#finish();
    return ok;
  }

  close() {
    if (!this.#state.open) return;
    this.#state = {
      open: false,
      href: "",
      error: "",
      language: "english",
      range: null,
    };
    this.#view.hide?.();
    this.#dismiss.close();
  }

  contains(target) {
    return this.#view.contains?.(target) ?? false;
  }

  destroy() {
    this.close();
    this.#dismiss.close();
    this.#view.destroy?.();
    this.#editor = null;
    this.#entry = null;
  }

  #setLink(href) {
    this.#restoreSelection();
    const ok = this.#editor?.commands?.setLink?.({ href }) !== false;
    if (ok) this.#finish();
    return ok;
  }

  #restoreSelection() {
    const range = this.#state.range;
    if (range) {
      this.#editor?.commands?.setTextSelection?.(range);
    }
  }

  #finish() {
    this.#editor?.commands?.focus?.();
    this.close();
  }
}

export function createTiptapLinkEditorController(options) {
  return new TiptapLinkEditorController(options);
}
