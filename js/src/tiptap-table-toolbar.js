import {
  createElement,
  defaultDocument,
  defaultWindow,
  mountFloatingRoot,
  positionFloatingElement,
  setHidden,
  viewportSize,
} from "./tiptap-ui-primitives.js";

export const TABLE_COMMANDS = Object.freeze([
  {
    id: "add-column-before",
    group: "Columns",
    title: "Insert column left",
    label: "Left",
    command: "addColumnBefore",
  },
  {
    id: "add-column-after",
    group: "Columns",
    title: "Insert column right",
    label: "Right",
    command: "addColumnAfter",
  },
  {
    id: "delete-column",
    group: "Columns",
    title: "Delete current column",
    label: "Delete",
    command: "deleteColumn",
    tone: "danger",
  },
  {
    id: "add-row-before",
    group: "Rows",
    title: "Insert row above",
    label: "Above",
    command: "addRowBefore",
  },
  {
    id: "add-row-after",
    group: "Rows",
    title: "Insert row below",
    label: "Below",
    command: "addRowAfter",
  },
  {
    id: "delete-row",
    group: "Rows",
    title: "Delete current row",
    label: "Delete",
    command: "deleteRow",
    tone: "danger",
  },
  {
    id: "merge-cells",
    group: "Cells",
    title: "Merge selected cells",
    label: "Merge",
    command: "mergeCells",
  },
  {
    id: "split-cell",
    group: "Cells",
    title: "Split current cell",
    label: "Split",
    command: "splitCell",
  },
  {
    id: "merge-or-split",
    group: "Cells",
    title: "Merge or split cells",
    label: "Auto",
    command: "mergeOrSplit",
  },
  {
    id: "toggle-header-row",
    group: "Headers",
    title: "Toggle header row",
    label: "Row",
    command: "toggleHeaderRow",
  },
  {
    id: "toggle-header-column",
    group: "Headers",
    title: "Toggle header column",
    label: "Column",
    command: "toggleHeaderColumn",
  },
  {
    id: "toggle-header-cell",
    group: "Headers",
    title: "Toggle header cell",
    label: "Cell",
    command: "toggleHeaderCell",
  },
  {
    id: "previous-cell",
    group: "Navigate",
    title: "Move to previous cell",
    label: "Prev",
    command: "goToPreviousCell",
  },
  {
    id: "next-cell",
    group: "Navigate",
    title: "Move to next cell",
    label: "Next",
    command: "goToNextCell",
  },
  {
    id: "fix-table",
    group: "Table",
    title: "Repair table structure",
    label: "Repair",
    command: "fixTables",
  },
  {
    id: "delete-table",
    group: "Table",
    title: "Delete table",
    label: "Delete",
    command: "deleteTable",
    tone: "danger",
  },
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
    let lastGroup = null;
    state.commands.forEach((command) => {
      if (lastGroup && lastGroup !== command.group) {
        const divider = createElement(this.#document, "span", "mn-tiptap-table-toolbar-divider");
        divider?.setAttribute?.("aria-hidden", "true");
        if (divider) this.#list.appendChild(divider);
      }
      lastGroup = command.group;

      const button = createElement(this.#document, "button", "mn-tiptap-table-toolbar-button");
      if (!button) return;

      button.type = "button";
      button.title = command.title;
      button.setAttribute("aria-label", command.title);
      button.textContent = command.label;
      button.dataset.commandId = command.id;
      button.dataset.group = command.group;
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
      commands: TABLE_COMMANDS.filter(
        (command) => typeof editor.commands?.[command.command] === "function",
      ),
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
