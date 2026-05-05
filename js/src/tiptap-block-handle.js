import {
  createElement,
  defaultDocument,
  defaultWindow,
  mountFloatingRoot,
  setHidden,
} from "./tiptap-ui-primitives.js";

const BLOCK_SELECTOR = [
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "li",
  "ol",
  "p",
  "pre",
  "table",
  "ul",
  "[data-type]",
].join(",");

const HORIZONTAL_GAP = 10;
const DEFAULT_HANDLE_SIZE = 28;
const CONTROL_GAP = 4;
const BRIDGE_PADDING = 8;
const SELECTED_CLASS = "mn-tiptap-block-selected";

function isElement(value) {
  return value && value.nodeType === 1;
}

function closestBlockElement(target, editorDom) {
  if (!isElement(target) || !isElement(editorDom)) {
    return null;
  }

  const block = target.closest?.(BLOCK_SELECTOR) ?? null;
  if (!block || block === editorDom || !editorDom.contains?.(block)) {
    return null;
  }

  return block;
}

function blockPosition(editor, block) {
  if (!editor?.view || typeof editor.view.posAtDOM !== "function" || !block) {
    return null;
  }

  try {
    const pos = editor.view.posAtDOM(block, 0);
    return Number.isFinite(pos) ? pos : null;
  } catch (_error) {
    return null;
  }
}

function blockNode(editor, block, pos) {
  if (Number.isFinite(pos)) {
    const node = editor?.state?.doc?.nodeAt?.(pos);
    if (node) return node;
  }
  return block?.pmViewDesc?.node ?? null;
}

function blockKind(block) {
  const tagName = String(block?.tagName ?? "").toLowerCase();
  if (!tagName) return "block";
  if (/^h[1-6]$/.test(tagName)) return "heading";
  if (tagName === "p") return "paragraph";
  if (tagName === "li") return "list_item";
  if (tagName === "ul" || tagName === "ol") return "list";
  if (tagName === "pre") return "code_block";
  if (tagName === "blockquote") return "quote";
  return tagName.replaceAll("-", "_");
}

function blockTargetFromEvent(event, editor) {
  const editorDom = editor?.view?.dom;
  const block = closestBlockElement(event?.target, editorDom);
  if (!block) return null;
  const pos = blockPosition(editor, block);

  return {
    block,
    kind: blockKind(block),
    pos,
    node: blockNode(editor, block, pos),
  };
}

function targetEquals(left, right) {
  return left?.block === right?.block && left?.pos === right?.pos && left?.kind === right?.kind;
}

class TiptapBlockHandleView {
  #document;
  #window;
  #root = null;
  #insertButton = null;
  #actionButton = null;
  #onAction = null;
  #onInsert = null;

  constructor({ document = defaultDocument(), window = defaultWindow(document) } = {}) {
    this.#document = document;
    this.#window = window;
  }

  mount(container) {
    if (this.#root || !this.#document) return;

    const root = createElement(this.#document, "div", "mn-tiptap-block-handle hidden");
    const insertButton = createElement(
      this.#document,
      "button",
      "mn-tiptap-block-handle-button mn-tiptap-block-handle-insert",
    );
    const insertIcon = createElement(this.#document, "span", "mn-tiptap-block-insert-icon");
    const actionButton = createElement(
      this.#document,
      "button",
      "mn-tiptap-block-handle-button mn-tiptap-block-handle-action",
    );
    const icon = createElement(this.#document, "span", "mn-tiptap-block-handle-icon");
    if (!root || !insertButton || !insertIcon || !actionButton || !icon) return;

    insertButton.type = "button";
    insertButton.title = "Insert block below";
    insertButton.setAttribute("aria-label", "Insert block below");
    insertButton.addEventListener("pointerdown", (event) => {
      event.preventDefault();
    });
    insertButton.addEventListener("mousedown", (event) => {
      event.preventDefault();
      this.#onInsert?.(event);
    });

    actionButton.type = "button";
    actionButton.title = "Block actions";
    actionButton.setAttribute("aria-label", "Block actions");
    actionButton.addEventListener("pointerdown", (event) => {
      event.preventDefault();
    });
    actionButton.addEventListener("mousedown", (event) => {
      event.preventDefault();
      this.#onAction?.(event);
    });

    insertButton.appendChild(insertIcon);
    actionButton.appendChild(icon);
    root.append(insertButton, actionButton);
    mountFloatingRoot(root, container, this.#document);

    this.#root = root;
    this.#insertButton = insertButton;
    this.#actionButton = actionButton;
    setHidden(root, true);
  }

  update(state) {
    if (!this.#root || !this.#actionButton || !state.open || !state.target?.block) return;

    this.#onAction = state.openActions ?? null;
    this.#onInsert = state.openInsert ?? null;
    const rect = state.target.block.getBoundingClientRect?.();
    if (!rect) return;

    const viewportWidth =
      state.target.block.ownerDocument?.documentElement?.clientWidth ??
      this.#window?.innerWidth ??
      1024;
    const size = this.#actionButton.offsetWidth || DEFAULT_HANDLE_SIZE;
    const controlsWidth = size * 2 + CONTROL_GAP;
    const bridgeWidth = controlsWidth + HORIZONTAL_GAP;
    const left = Math.max(
      6,
      Math.min(rect.left - bridgeWidth, viewportWidth - bridgeWidth - 6),
    );
    const top = rect.top + Math.max(0, (rect.height - size) / 2);

    this.#root.dataset.blockKind = state.target.kind;
    this.#root.style.left = `${left}px`;
    this.#root.style.top = `${top}px`;
    this.#root.style.width = `${bridgeWidth + BRIDGE_PADDING}px`;
    setHidden(this.#root, false);
  }

  contains(target) {
    return this.#root?.contains?.(target) ?? false;
  }

  containsPointer(event, target) {
    const handleRect = this.#root?.getBoundingClientRect?.();
    const blockRect = target?.block?.getBoundingClientRect?.();
    if (!handleRect || !blockRect) return false;

    const x = Number(event?.clientX);
    const y = Number(event?.clientY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;

    const left = Math.min(handleRect.left, blockRect.left) - 2;
    const right = Math.max(handleRect.right, blockRect.left) + 2;
    const top = Math.min(handleRect.top, blockRect.top) - 8;
    const bottom = Math.max(handleRect.bottom, blockRect.bottom) + 8;
    return x >= left && x <= right && y >= top && y <= bottom;
  }

  actionRect() {
    return this.#actionButton?.getBoundingClientRect?.() ?? this.#root?.getBoundingClientRect?.();
  }

  insertRect() {
    return this.#insertButton?.getBoundingClientRect?.() ?? this.#root?.getBoundingClientRect?.();
  }

  hide() {
    setHidden(this.#root, true);
  }

  destroy() {
    this.#root?.remove?.();
    this.#root = null;
    this.#insertButton = null;
    this.#actionButton = null;
  }
}

export class TiptapBlockHandleController {
  #view;
  #menu;
  #insertMenu;
  #editor = null;
  #entry = null;
  #root = null;
  #removeListeners = [];
  #state = {
    open: false,
    target: null,
  };

  constructor({ menu = null, insertMenu = null, view = null, dom = {} } = {}) {
    this.#menu = menu;
    this.#insertMenu = insertMenu;
    this.#view =
      view ??
      new TiptapBlockHandleView({
        document: dom.document ?? defaultDocument(),
        window: dom.window,
      });
  }

  get state() {
    return {
      open: this.#state.open,
      target: this.#state.target
        ? {
            kind: this.#state.target.kind,
            pos: this.#state.target.pos,
            block: this.#state.target.block,
          }
        : null,
    };
  }

  attach({ editor, root, entry } = {}) {
    this.#editor = editor ?? null;
    this.#entry = entry ?? null;
    this.#root = root ?? editor?.view?.dom ?? null;
    this.#view.mount?.(root);
    this.#menu?.attach?.({ editor, root, entry });
    this.#bind();
  }

  #bind() {
    this.#unbind();
    const listenTarget = this.#root;
    if (!listenTarget?.addEventListener) return;

    const onMouseMove = (event) => this.handlePointerMove(event);
    const onMouseLeave = (event) => {
      if (this.#view.contains?.(event?.relatedTarget)) return;
      this.close();
    };
    const onScroll = () => this.close();
    const onKeyDown = (event) => this.handleKeyDown(event);

    listenTarget.addEventListener("mousemove", onMouseMove);
    listenTarget.addEventListener("mouseleave", onMouseLeave);
    listenTarget.addEventListener("scroll", onScroll, true);
    listenTarget.addEventListener("keydown", onKeyDown);
    this.#removeListeners = [
      () => listenTarget.removeEventListener?.("mousemove", onMouseMove),
      () => listenTarget.removeEventListener?.("mouseleave", onMouseLeave),
      () => listenTarget.removeEventListener?.("scroll", onScroll, true),
      () => listenTarget.removeEventListener?.("keydown", onKeyDown),
    ];
  }

  #unbind() {
    this.#removeListeners.forEach((remove) => remove());
    this.#removeListeners = [];
  }

  handlePointerMove(event) {
    if (!this.#editor || this.#entry?.viewMode !== "hybrid") {
      this.close();
      return this.state;
    }

    const target = blockTargetFromEvent(event, this.#editor);
    if (!target) {
      if (this.#state.open && this.#view.containsPointer?.(event, this.#state.target)) {
        this.#updateView();
        return this.state;
      }
      this.close();
      return this.state;
    }

    if (targetEquals(this.#state.target, target) && this.#state.open) {
      this.#view.update?.(this.#state, this.#editor);
      return this.state;
    }

    this.#state = {
      open: true,
      target,
    };
    this.#updateView();
    return this.state;
  }

  openActions() {
    if (!this.#state.open || !this.#state.target || this.#entry?.viewMode !== "hybrid") {
      return false;
    }
    this.#selectTarget(this.#state.target);
    this.#insertMenu?.close?.();
    this.#menu?.open?.(this.#state.target, { anchorRect: this.#view.actionRect?.() });
    return true;
  }

  openInsert() {
    if (!this.#state.open || !this.#state.target || this.#entry?.viewMode !== "hybrid") {
      return false;
    }

    this.#selectTarget(this.#state.target);
    this.#menu?.close?.();
    return this.#insertMenu?.openAtBlock?.(this.#state.target, {
      anchorRect: this.#view.insertRect?.(),
    }) !== false;
  }

  handleKeyDown(event) {
    return (
      this.#insertMenu?.handleKeyDown?.(event) ??
      this.#menu?.handleKeyDown?.(event) ??
      false
    );
  }

  refresh() {
    if (!this.#state.open || this.#entry?.viewMode !== "hybrid") {
      this.close();
      return this.state;
    }

    this.#updateView();
    return this.state;
  }

  #updateView() {
    this.#view.update?.(
      {
        ...this.#state,
        openActions: () => this.openActions(),
        openInsert: () => this.openInsert(),
      },
      this.#editor,
    );
  }

  #selectTarget(target) {
    this.#clearSelectedBlock();
    target?.block?.classList?.add?.(SELECTED_CLASS);

    const from = target?.pos;
    const to = targetEndPos(target);
    if (Number.isFinite(from)) {
      if (typeof this.#editor?.commands?.setNodeSelection === "function") {
        this.#editor.commands.setNodeSelection(from);
      } else if (Number.isFinite(to) && to > from) {
        this.#editor?.commands?.setTextSelection?.({ from, to });
      } else {
        this.#editor?.commands?.setTextSelection?.(from);
      }
    }
    this.#editor?.commands?.focus?.();
  }

  #clearSelectedBlock() {
    this.#root
      ?.querySelectorAll?.(`.${SELECTED_CLASS}`)
      ?.forEach?.((block) => block.classList.remove(SELECTED_CLASS));
  }

  close() {
    if (!this.#state.open) return;
    this.#clearSelectedBlock();
    this.#state = {
      open: false,
      target: null,
    };
    this.#view.hide?.();
    this.#menu?.close?.();
    this.#insertMenu?.close?.();
  }

  destroy() {
    this.close();
    this.#unbind();
    this.#menu?.destroy?.();
    this.#view.destroy?.();
    this.#editor = null;
    this.#entry = null;
    this.#root = null;
  }
}

function targetEndPos(target) {
  const nodeSize = target?.node?.nodeSize ?? target?.block?.pmViewDesc?.node?.nodeSize ?? 0;
  return Number.isFinite(target?.pos) ? target.pos + Math.max(1, nodeSize) : null;
}

export function createTiptapBlockHandleController(options) {
  return new TiptapBlockHandleController(options);
}
