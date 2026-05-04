import { createTiptapFormatCommandController } from "./tiptap-format-commands.js";

const DEFAULT_COLLISION_MARGIN = 10;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function defaultDocument() {
  return typeof document === "undefined" ? null : document;
}

function defaultWindow(documentRef) {
  return documentRef?.defaultView ?? (typeof window === "undefined" ? null : window);
}

function createElement(documentRef, tagName, className) {
  const element = documentRef?.createElement?.(tagName) ?? null;
  if (element && className) {
    element.className = className;
  }
  return element;
}

function setHidden(element, hidden) {
  if (!element) return;
  element.hidden = hidden;
  element.classList?.toggle?.("hidden", hidden);
}

function selectionContext(editor) {
  const state = editor?.state ?? editor?.view?.state;
  const selection = state?.selection;
  if (!selection || selection.empty || typeof selection.from !== "number") {
    return null;
  }

  return {
    from: selection.from,
    to: selection.to,
  };
}

function selectionRect(editor, range) {
  const view = editor?.view;
  if (!view || typeof view.coordsAtPos !== "function" || !range) {
    return null;
  }

  const from = view.coordsAtPos(range.from);
  const to = view.coordsAtPos(range.to);
  return {
    left: Math.min(from.left, to.left),
    right: Math.max(from.right ?? from.left, to.right ?? to.left),
    top: Math.min(from.top, to.top),
    bottom: Math.max(from.bottom ?? from.top, to.bottom ?? to.top),
  };
}

function viewportSize(editor, fallbackWindow) {
  const documentElement = editor?.view?.dom?.ownerDocument?.documentElement;
  return {
    width: documentElement?.clientWidth ?? fallbackWindow?.innerWidth ?? 1024,
    height: documentElement?.clientHeight ?? fallbackWindow?.innerHeight ?? 768,
  };
}

function placeToolbar(element, editor, range, fallbackWindow) {
  const rect = selectionRect(editor, range);
  if (!element || !rect) return;

  const viewport = viewportSize(editor, fallbackWindow);
  const width = element.offsetWidth || 184;
  const height = element.offsetHeight || 38;
  const margin = DEFAULT_COLLISION_MARGIN;
  const center = rect.left + (rect.right - rect.left) / 2;
  const left = clamp(center - width / 2, margin, Math.max(margin, viewport.width - width - margin));
  const preferredTop = rect.top - height - 8;
  const top =
    preferredTop < margin
      ? clamp(rect.bottom + 8, margin, viewport.height - height - margin)
      : clamp(preferredTop, margin, viewport.height - height - margin);

  element.style.left = `${left}px`;
  element.style.top = `${top}px`;
}

class TiptapFormatToolbarView {
  #document;
  #window;
  #root = null;
  #list = null;

  constructor({ document = defaultDocument(), window = defaultWindow(document) } = {}) {
    this.#document = document;
    this.#window = window;
  }

  mount(container) {
    if (this.#root || !this.#document) return;

    const root = createElement(this.#document, "div", "mn-tiptap-format-toolbar hidden");
    const list = createElement(this.#document, "div", "mn-tiptap-format-toolbar-list");
    if (!root || !list) return;

    root.role = "toolbar";
    root.setAttribute("aria-label", "Text formatting");
    root.appendChild(list);
    (container?.ownerDocument?.body ?? this.#document.body)?.appendChild(root);

    this.#root = root;
    this.#list = list;
    setHidden(root, true);
  }

  update(state, editor) {
    if (!this.#root || !this.#list || !state.open) return;

    this.#list.replaceChildren();
    state.commands.forEach((command) => {
      const button = createElement(
        this.#document,
        "button",
        "mn-tiptap-format-toolbar-button",
      );
      const icon = createElement(
        this.#document,
        "span",
        `mn-tiptap-format-toolbar-icon ${command.icon}`,
      );
      const text = createElement(this.#document, "span", "mn-tiptap-format-toolbar-label");
      if (!button || !icon || !text) return;

      button.type = "button";
      button.title = command.title;
      button.setAttribute("aria-label", command.ariaLabel);
      button.setAttribute("aria-pressed", String(command.active));
      button.classList.toggle("active", command.active);
      button.dataset.commandId = command.id;
      text.textContent = command.label;
      button.append(icon, text);
      button.addEventListener("mousedown", (event) => {
        event.preventDefault();
        state.run(command.id);
      });
      this.#list.appendChild(button);
    });

    setHidden(this.#root, false);
    placeToolbar(this.#root, editor, state.range, this.#window);
  }

  hide() {
    setHidden(this.#root, true);
  }

  destroy() {
    this.#root?.remove?.();
    this.#root = null;
    this.#list = null;
  }
}

export class TiptapFormatToolbarController {
  #commands;
  #view;
  #editor = null;
  #entry = null;
  #state = {
    open: false,
    range: null,
    commands: [],
  };

  constructor({
    commandController = createTiptapFormatCommandController(),
    view = null,
    dom = {},
  } = {}) {
    this.#commands = commandController;
    this.#view =
      view ??
      new TiptapFormatToolbarView({
        document: dom.document ?? defaultDocument(),
        window: dom.window,
      });
  }

  get state() {
    return {
      ...this.#state,
      range: this.#state.range ? { ...this.#state.range } : null,
      commands: this.#state.commands.map((command) => ({ ...command })),
    };
  }

  attach({ editor, root, entry } = {}) {
    this.#editor = editor ?? null;
    this.#entry = entry ?? null;
    this.#view.mount?.(root);
    this.refresh(editor);
  }

  refresh(editor = this.#editor) {
    if (!editor || this.#entry?.viewMode !== "hybrid") {
      this.close();
      return this.state;
    }

    const range = selectionContext(editor);
    if (!range) {
      this.close();
      return this.state;
    }

    this.#state = {
      open: true,
      range,
      commands: this.#commands.states({ editor, entry: this.#entry }),
    };
    this.#view.update?.(
      {
        ...this.#state,
        run: (commandId) => this.run(commandId),
      },
      editor,
    );
    return this.state;
  }

  run(commandId) {
    if (!this.#editor) return false;
    const result = this.#commands.run(commandId, {
      editor: this.#editor,
      entry: this.#entry,
      source: "format_toolbar",
    });
    this.refresh(this.#editor);
    return result.ok;
  }

  close() {
    if (!this.#state.open) return;
    this.#state = {
      open: false,
      range: null,
      commands: [],
    };
    this.#view.hide?.();
  }

  destroy() {
    this.close();
    this.#view.destroy?.();
    this.#editor = null;
    this.#entry = null;
  }
}

export function createTiptapFormatToolbarController(options) {
  return new TiptapFormatToolbarController(options);
}
