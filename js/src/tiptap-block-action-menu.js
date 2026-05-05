import { createTiptapBlockActionController } from "./tiptap-block-actions.js";
import {
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

const DEFAULT_WIDTH = 280;
const DEFAULT_HEIGHT = 248;
const DEFAULT_MARGIN = 10;

function placeMenu(element, target, fallbackWindow) {
  const rect = target?.block?.getBoundingClientRect?.();
  if (!element || !rect) return;

  positionFloatingElement(element, rect, {
    viewport: viewportSize(target.block, fallbackWindow),
    size: {
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      margin: DEFAULT_MARGIN,
    },
    placement: "left",
  });
}

class TiptapBlockActionMenuView {
  #document;
  #window;
  #ownerId;
  #root = null;
  #list = null;

  constructor({
    document = defaultDocument(),
    window = defaultWindow(document),
    ownerId = "mn-tiptap-block-action-menu",
  } = {}) {
    this.#document = document;
    this.#window = window;
    this.#ownerId = ownerId;
  }

  mount(container) {
    if (this.#root || !this.#document) return;

    const root = createElement(this.#document, "div", "mn-tiptap-block-action-menu hidden");
    const list = createElement(this.#document, "div", "mn-tiptap-block-action-menu-list");
    if (!root || !list) return;

    root.id = this.#ownerId;
    root.role = "menu";
    root.setAttribute("aria-label", "Block actions");
    root.appendChild(list);
    mountFloatingRoot(root, container, this.#document);

    this.#root = root;
    this.#list = list;
    setHidden(root, true);
  }

  update(state) {
    if (!this.#root || !this.#list || !state.open) return;

    this.#list.replaceChildren();
    state.commands.forEach((command, index) => {
      const item = createElement(this.#document, "button", "mn-tiptap-block-action-menu-item");
      const title = createElement(this.#document, "span", "mn-tiptap-block-action-menu-title");
      const description = createElement(
        this.#document,
        "span",
        "mn-tiptap-block-action-menu-description",
      );
      const group = createElement(this.#document, "span", "mn-tiptap-block-action-menu-group");
      if (!item || !title || !description || !group) return;

      item.type = "button";
      item.id = commandElementId(this.#ownerId, index);
      item.role = "menuitem";
      item.dataset.commandId = command.id;
      item.dataset.tone = command.tone;
      item.tabIndex = index === state.selectedIndex ? 0 : -1;
      item.classList.toggle("active", index === state.selectedIndex);
      title.textContent = command.title;
      description.textContent = command.description;
      group.textContent = command.group;
      item.append(title, group, description);
      item.addEventListener("mousedown", (event) => {
        event.preventDefault();
        state.run(command.id);
      });
      this.#list.appendChild(item);
    });

    updateActiveDescendant(this.#root, this.#ownerId, state.commands, state.selectedIndex);
    setHidden(this.#root, false);
    placeMenu(this.#root, state.target, this.#window);
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

export class TiptapBlockActionMenuController {
  #commands;
  #view;
  #editor = null;
  #entry = null;
  #state = {
    open: false,
    target: null,
    commands: [],
    selectedIndex: 0,
  };

  constructor({
    commandController = createTiptapBlockActionController(),
    view = null,
    dom = {},
  } = {}) {
    this.#commands = commandController;
    this.#view =
      view ??
      new TiptapBlockActionMenuView({
        document: dom.document ?? defaultDocument(),
        window: dom.window,
      });
  }

  get state() {
    return {
      ...this.#state,
      target: this.#state.target ? { ...this.#state.target } : null,
      commands: this.#state.commands.map((command) => ({ ...command })),
    };
  }

  attach({ editor, root, entry } = {}) {
    this.#editor = editor ?? null;
    this.#entry = entry ?? null;
    this.#view.mount?.(root);
  }

  open(target) {
    if (!this.#editor || this.#entry?.viewMode !== "hybrid" || !target?.block) {
      this.close();
      return this.state;
    }

    this.#state = {
      open: true,
      target,
      commands: this.#commands.list({ editor: this.#editor, entry: this.#entry, target }),
      selectedIndex: 0,
    };
    this.#view.update?.(
      {
        ...this.#state,
        run: (commandId) => this.run(commandId),
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
        run: (commandId) => this.run(commandId),
      },
      this.#editor,
    );
    return this.state;
  }

  run(commandId = this.#state.commands[this.#state.selectedIndex]?.id) {
    if (!this.#state.open || !commandId || !this.#editor) return false;
    const target = this.#state.target;
    this.close();
    const result = this.#commands.run(commandId, {
      editor: this.#editor,
      entry: this.#entry,
      target,
      source: "block_action_menu",
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
      return this.run();
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
      target: null,
      commands: [],
      selectedIndex: 0,
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

export function createTiptapBlockActionMenuController(options) {
  return new TiptapBlockActionMenuController(options);
}
