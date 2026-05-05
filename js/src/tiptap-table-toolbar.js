import {
  createElement,
  defaultDocument,
  defaultWindow,
  mountFloatingRoot,
  positionFloatingElement,
  setHidden,
  viewportSize,
} from "./tiptap-ui-primitives.js";

const TABLE_COMMANDS = Object.freeze([
  { id: "add-column-before", title: "Insert column left", label: "Col left", command: "addColumnBefore" },
  { id: "add-column-after", title: "Insert column right", label: "Col right", command: "addColumnAfter" },
  { id: "delete-column", title: "Delete column", label: "Del col", command: "deleteColumn", tone: "danger" },
  { id: "add-row-before", title: "Insert row above", label: "Row above", command: "addRowBefore" },
  { id: "add-row-after", title: "Insert row below", label: "Row below", command: "addRowAfter" },
  { id: "delete-row", title: "Delete row", label: "Del row", command: "deleteRow", tone: "danger" },
  { id: "merge-cells", title: "Merge selected cells", label: "Merge", command: "mergeCells" },
  { id: "split-cell", title: "Split selected cell", label: "Split", command: "splitCell" },
  { id: "toggle-header-row", title: "Toggle header row", label: "Head row", command: "toggleHeaderRow" },
  { id: "delete-table", title: "Delete table", label: "Del table", command: "deleteTable", tone: "danger" },
]);

function closestTableElement(target, editorDom) {
  if (!target?.closest || !editorDom?.contains) return null;
  const table = target.closest(".mn-tiptap-table, table");
  return table && editorDom.contains(table) ? table : null;
}

function activeTableContext(editor) {
  const selection = editor?.state?.selection;
  const view = editor?.view;
  const domAtPos = typeof view?.domAtPos === "function" && Number.isFinite(selection?.from)
    ? view.domAtPos(selection.from)
    : null;
  const node = domAtPos?.node?.nodeType === 1 ? domAtPos.node : domAtPos?.node?.parentElement;
  const table = closestTableElement(node, view?.dom);
  if (!table) return null;

  return {
    table,
    rect: table.getBoundingClientRect?.(),
  };
}

function runEditorCommand(editor, commandName) {
  const command = editor?.commands?.[commandName];
  if (typeof command !== "function") return false;
  const ok = command() !== false;
  if (ok) editor?.commands?.focus?.();
  return ok;
}

class TiptapTableToolbarView {
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

    const root = createElement(this.#document, "div", "mn-tiptap-table-toolbar hidden");
    const list = createElement(this.#document, "div", "mn-tiptap-table-toolbar-list");
    if (!root || !list) return;

    root.role = "toolbar";
    root.setAttribute("aria-label", "Table tools");
    root.appendChild(list);
    mountFloatingRoot(root, container, this.#document);
    this.#root = root;
    this.#list = list;
    setHidden(root, true);
  }

  update(state) {
    if (!this.#root || !this.#list || !state.open) return;

    this.#list.replaceChildren();
    state.commands.forEach((command) => {
      const button = createElement(this.#document, "button", "mn-tiptap-table-toolbar-button");
      if (!button) return;

      button.type = "button";
      button.title = command.title;
      button.textContent = command.label;
      button.dataset.commandId = command.id;
      button.dataset.tone = command.tone ?? "default";
      button.addEventListener("mousedown", (event) => {
        event.preventDefault();
        state.run(command.id);
      });
      this.#list.appendChild(button);
    });

    setHidden(this.#root, false);
    positionFloatingElement(this.#root, state.rect, {
      viewport: viewportSize(state.table, this.#window),
      size: {
        width: 520,
        height: 42,
        margin: 10,
      },
      placement: "top",
    });
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
    this.#list = null;
  }
}

export class TiptapTableToolbarController {
  #view;
  #editor = null;
  #entry = null;
  #state = {
    open: false,
    table: null,
    rect: null,
    commands: [],
  };

  constructor({ view = null, dom = {} } = {}) {
    this.#view =
      view ??
      new TiptapTableToolbarView({
        document: dom.document ?? defaultDocument(),
        window: dom.window,
      });
  }

  get state() {
    return {
      ...this.#state,
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

    const context = activeTableContext(editor);
    if (!context?.rect) {
      this.close();
      return this.state;
    }

    this.#state = {
      open: true,
      table: context.table,
      rect: context.rect,
      commands: TABLE_COMMANDS.filter((command) => typeof editor.commands?.[command.command] === "function"),
    };
    this.#view.update?.({
      ...this.#state,
      run: (commandId) => this.run(commandId),
    });
    return this.state;
  }

  run(commandId) {
    const command = TABLE_COMMANDS.find((item) => item.id === commandId);
    if (!command || !this.#editor) return false;
    const ok = runEditorCommand(this.#editor, command.command);
    this.refresh(this.#editor);
    return ok;
  }

  close() {
    if (!this.#state.open) return;
    this.#state = {
      open: false,
      table: null,
      rect: null,
      commands: [],
    };
    this.#view.hide?.();
  }

  contains(target) {
    return this.#view.contains?.(target) ?? false;
  }

  destroy() {
    this.close();
    this.#view.destroy?.();
    this.#editor = null;
    this.#entry = null;
  }
}

export function createTiptapTableToolbarController(options) {
  return new TiptapTableToolbarController(options);
}
