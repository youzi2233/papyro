import { createTiptapSlashCommandController } from "./tiptap-slash-commands.js";
import {
  clamp,
  commandElementId,
  createElement,
  defaultDocument,
  defaultWindow,
  mountFloatingRoot,
  positionFloatingElement,
  setHidden,
  updateActiveDescendant,
  viewportSize,
} from "./tiptap-ui-primitives.js";

const DEFAULT_MAX_ITEMS = 8;
const DEFAULT_MAX_QUERY_LENGTH = 48;
const TABLE_GRID_ROWS = 6;
const TABLE_GRID_COLS = 6;

function chooseTableSize(tablePicker, rows, cols) {
  tablePicker?._choose?.(rows, cols);
}

function isTriggerBoundary(character) {
  return !character || /\s/.test(character);
}

function textSelectionContext(editor) {
  const state = editor?.state ?? editor?.view?.state;
  const selection = state?.selection;
  const doc = state?.doc;
  if (!selection?.empty || !doc || typeof doc.textBetween !== "function") {
    return null;
  }

  const cursor = selection.from;
  const blockStart = selection.$from?.start?.() ?? Math.max(0, cursor - DEFAULT_MAX_QUERY_LENGTH);
  const text = doc.textBetween(blockStart, cursor, "\n", "\uFFFC");

  return {
    blockStart,
    cursor,
    text,
  };
}

function placeMenu(element, editor, range, anchorRect = null) {
  if (element && anchorRect) {
    positionFloatingElement(element, anchorRect, {
      viewport: viewportSize(editor?.view?.dom, defaultWindow(editor?.view?.dom?.ownerDocument)),
      size: {
        width: 320,
        height: 220,
        margin: 10,
      },
      placement: "bottom",
    });
    return;
  }

  const view = editor?.view;
  if (!element || !view || typeof view.coordsAtPos !== "function" || !range) {
    return;
  }

  const rect = view.coordsAtPos(range.to);
  positionFloatingElement(element, rect, {
    viewport: viewportSize(view.dom, defaultWindow(view.dom?.ownerDocument)),
    size: {
      width: 320,
      height: 220,
      margin: 10,
    },
    placement: "bottom",
  });
}

export function findSlashTrigger(
  text,
  cursorOffset = String(text ?? "").length,
  { maxQueryLength = DEFAULT_MAX_QUERY_LENGTH } = {},
) {
  const source = String(text ?? "");
  const cursor = clamp(Number(cursorOffset) || 0, 0, source.length);
  const beforeCursor = source.slice(0, cursor);
  const slashIndex = beforeCursor.lastIndexOf("/");
  if (slashIndex < 0) return null;

  const query = beforeCursor.slice(slashIndex + 1);
  if (query.length > maxQueryLength || /[\r\n]/.test(query)) return null;

  const beforeSlash = beforeCursor.charAt(slashIndex - 1);
  if (!isTriggerBoundary(beforeSlash)) return null;

  return {
    from: slashIndex,
    to: cursor,
    query,
  };
}

class TiptapSlashMenuView {
  #document;
  #ownerId;
  #root = null;
  #list = null;
  #empty = null;
  #tablePicker = null;
  #tablePickerLabel = null;

  constructor({ document = defaultDocument(), ownerId = "mn-tiptap-slash-menu" } = {}) {
    this.#document = document;
    this.#ownerId = ownerId;
  }

  mount(container) {
    if (this.#root || !this.#document) return;

    const root = createElement(this.#document, "div", "mn-tiptap-slash-menu hidden");
    const list = createElement(this.#document, "div", "mn-tiptap-slash-menu-list");
    const empty = createElement(this.#document, "div", "mn-tiptap-slash-menu-empty");
    const tablePicker = createElement(this.#document, "div", "mn-tiptap-table-size-picker hidden");
    const tablePickerLabel = createElement(this.#document, "div", "mn-tiptap-table-size-picker-label");
    const tablePickerGrid = createElement(this.#document, "div", "mn-tiptap-table-size-picker-grid");
    if (!root || !list || !empty || !tablePicker || !tablePickerLabel || !tablePickerGrid) return;

    root.id = this.#ownerId;
    root.role = "listbox";
    root.setAttribute("aria-label", "Markdown block commands");
    empty.textContent = "No commands";
    tablePickerLabel.textContent = "Table 3 x 2";
    for (let row = 1; row <= TABLE_GRID_ROWS; row += 1) {
      for (let col = 1; col <= TABLE_GRID_COLS; col += 1) {
        const cell = createElement(this.#document, "button", "mn-tiptap-table-size-picker-cell");
        if (!cell) continue;
        cell.type = "button";
        cell.dataset.row = String(row);
        cell.dataset.col = String(col);
        cell.setAttribute("aria-label", `Insert ${row} by ${col} table`);
        cell.addEventListener("pointerenter", () => {
          this.#updateTablePickerSize(row, col);
        });
        cell.addEventListener("pointerdown", (event) => {
          event.preventDefault();
          event.stopPropagation?.();
          chooseTableSize(tablePicker, row, col);
        });
        cell.addEventListener("mousedown", (event) => {
          event.preventDefault();
        });
        tablePickerGrid.appendChild(cell);
      }
    }
    tablePicker.append(tablePickerLabel, tablePickerGrid);
    root.append(list, empty, tablePicker);
    mountFloatingRoot(root, container, this.#document);

    this.#root = root;
    this.#list = list;
    this.#empty = empty;
    this.#tablePicker = tablePicker;
    this.#tablePickerLabel = tablePickerLabel;
    setHidden(root, true);
  }

  update(state, editor) {
    if (!this.#root || !this.#list || !this.#empty || !state.open) return;

    this.#list.replaceChildren();
    state.commands.forEach((command, index) => {
      const item = createElement(this.#document, "button", "mn-tiptap-slash-menu-item");
      const title = createElement(this.#document, "span", "mn-tiptap-slash-menu-title");
      const description = createElement(
        this.#document,
        "span",
        "mn-tiptap-slash-menu-description",
      );
      const group = createElement(this.#document, "span", "mn-tiptap-slash-menu-group");
      if (!item || !title || !description || !group) return;

      item.type = "button";
      item.id = commandElementId(this.#ownerId, index);
      item.role = "option";
      item.setAttribute("aria-selected", String(index === state.selectedIndex));
      item.classList.toggle("active", index === state.selectedIndex);
      item.dataset.commandId = command.id;
      item.tabIndex = -1;
      title.textContent = command.title;
      description.textContent = command.description ?? "";
      group.textContent = command.group ?? "";

      item.append(title, group, description);
      item.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation?.();
        state.choose(command.id);
      });
      item.addEventListener("mousedown", (event) => {
        event.preventDefault();
      });
      this.#list.appendChild(item);
    });

    this.#updateTablePicker(state);
    setHidden(this.#empty, state.commands.length > 0);
    updateActiveDescendant(this.#root, this.#ownerId, state.commands, state.selectedIndex);
    setHidden(this.#root, false);
    placeMenu(this.#root, editor, state.range, state.anchorRect);
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
    this.#empty = null;
    this.#tablePicker = null;
    this.#tablePickerLabel = null;
  }

  #updateTablePicker(state) {
    if (!this.#tablePicker) return;
    const selectedCommand = state.commands[state.selectedIndex];
    const showPicker = selectedCommand?.id === "table";
    setHidden(this.#tablePicker, !showPicker);
    if (showPicker) {
      this.#tablePicker._choose = (rows, cols) => state.choose("table", { tableSize: { rows, cols } });
      this.#updateTablePickerSize(3, 2);
    } else {
      this.#tablePicker._choose = null;
    }
  }

  #updateTablePickerSize(rows, cols) {
    if (!this.#tablePicker || !this.#tablePickerLabel) return;
    this.#tablePickerLabel.textContent = `Table ${rows} x ${cols}`;
    this.#tablePicker
      .querySelectorAll?.(".mn-tiptap-table-size-picker-cell")
      ?.forEach?.((cell) => {
        const cellRow = Number(cell.dataset?.row);
        const cellCol = Number(cell.dataset?.col);
        cell.classList?.toggle?.("active", cellRow <= rows && cellCol <= cols);
      });
  }
}

export class TiptapSlashMenuController {
  #commands;
  #maxItems;
  #view;
  #state = {
    open: false,
    query: "",
    range: null,
    commands: [],
    selectedIndex: 0,
    deleteRangeBeforeRun: true,
    anchorRect: null,
  };
  #editor = null;
  #entry = null;

  constructor({
    commandController = createTiptapSlashCommandController(),
    maxItems = DEFAULT_MAX_ITEMS,
    view = null,
    dom = {},
  } = {}) {
    this.#commands = commandController;
    this.#maxItems = maxItems;
    this.#view =
      view ??
      new TiptapSlashMenuView({
        document: dom.document ?? defaultDocument(),
      });
  }

  get state() {
    return {
      ...this.#state,
      commands: [...this.#state.commands],
      range: this.#state.range ? { ...this.#state.range } : null,
    };
  }

  attach({ editor, root, entry } = {}) {
    this.#editor = editor ?? null;
    this.#entry = entry ?? null;
    this.#view.mount?.(root);
    this.refresh(editor);
  }

  refresh(editor = this.#editor) {
    if (!editor) {
      this.close();
      return this.state;
    }

    const context = textSelectionContext(editor);
    if (!context) {
      this.close();
      return this.state;
    }

    const trigger = findSlashTrigger(context.text);
    if (!trigger) {
      this.close();
      return this.state;
    }

    const commands = this.#commands.query(trigger.query, { limit: this.#maxItems });
    const previousCommandId = this.#state.commands[this.#state.selectedIndex]?.id;
    const nextSelectedIndex = clamp(
      commands.findIndex((command) => command.id === previousCommandId),
      0,
      Math.max(0, commands.length - 1),
    );

    this.#state = {
      open: true,
      query: trigger.query,
      range: {
        from: context.blockStart + trigger.from,
        to: context.blockStart + trigger.to,
      },
      commands,
      selectedIndex: nextSelectedIndex < 0 ? 0 : nextSelectedIndex,
      deleteRangeBeforeRun: true,
      anchorRect: null,
    };
    this.#view.update?.(
      {
        ...this.#state,
      choose: (commandId, options) => this.choose(commandId, options),
      },
      editor,
    );
    return this.state;
  }

  openAtBlock(target, { anchorRect = null } = {}) {
    if (!this.#editor || (this.#entry && this.#entry.viewMode !== "hybrid")) {
      this.close();
      return this.state;
    }

    const position = blockInsertPosition(target);
    if (!Number.isFinite(position)) {
      this.close();
      return this.state;
    }

    this.#editor.commands?.focus?.(position);
    this.#editor.commands?.insertContentAt?.(position, "\n", {
      contentType: "markdown",
    });
    this.#editor.commands?.focus?.();

    const commands = this.#commands.query("", { limit: this.#maxItems });
    this.#state = {
      open: true,
      query: "",
      range: {
        from: position,
        to: position,
      },
      commands,
      selectedIndex: 0,
      deleteRangeBeforeRun: false,
      anchorRect,
    };
    this.#view.update?.(
      {
        ...this.#state,
      choose: (commandId, options) => this.choose(commandId, options),
      },
      this.#editor,
    );
    return this.state;
  }

  moveSelection(delta) {
    if (!this.#state.open || this.#state.commands.length === 0) return this.state;
    const count = this.#state.commands.length;
    this.#state = {
      ...this.#state,
      selectedIndex: (this.#state.selectedIndex + delta + count) % count,
    };
    this.#view.update?.(
      {
        ...this.#state,
      choose: (commandId, options) => this.choose(commandId, options),
      },
      this.#editor,
    );
    return this.state;
  }

  choose(commandId = this.#state.commands[this.#state.selectedIndex]?.id, options = {}) {
    if (!this.#state.open || !commandId || !this.#editor) return false;
    const range = this.#state.range;
    const shouldDeleteRange = this.#state.deleteRangeBeforeRun;
    this.close();

    if (shouldDeleteRange && range && typeof this.#editor.commands?.deleteRange === "function") {
      this.#editor.commands.deleteRange(range);
    }

    const result = this.#commands.run(commandId, {
      editor: this.#editor,
      entry: this.#entry,
      source: "slash_menu",
      ...options,
    });
    return result.ok;
  }

  handleKeyDown(event) {
    if (!this.#state.open) return false;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.moveSelection(1);
      return true;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      this.moveSelection(-1);
      return true;
    }

    if (event.key === "Enter" || event.key === "Tab") {
      if (this.#state.commands.length === 0) return false;
      event.preventDefault();
      return this.choose();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      this.close();
      return true;
    }

    return false;
  }

  close() {
    if (!this.#state.open) return;
    this.#state = {
      open: false,
      query: "",
      range: null,
      commands: [],
      selectedIndex: 0,
      deleteRangeBeforeRun: true,
      anchorRect: null,
    };
    this.#view.hide?.();
  }

  destroy() {
    this.close();
    this.#view.destroy?.();
    this.#editor = null;
    this.#entry = null;
  }

  contains(target) {
    return this.#view.contains?.(target) ?? false;
  }
}

export function createTiptapSlashMenuController(options) {
  return new TiptapSlashMenuController(options);
}

function blockInsertPosition(target) {
  const nodeSize = target?.node?.nodeSize ?? target?.block?.pmViewDesc?.node?.nodeSize ?? 0;
  return Number.isFinite(target?.pos) ? target.pos + Math.max(1, nodeSize) : null;
}
