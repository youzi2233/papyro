import test from "node:test";
import assert from "node:assert/strict";

import { createTiptapLinkEditorController } from "../src/tiptap-link-editor.js";

function createViewSpy() {
  const calls = [];
  let containedTarget = null;
  return {
    calls,
    mount(root) {
      calls.push(["mount", root?.className ?? ""]);
    },
    update(state) {
      calls.push([
        "update",
        state.href,
        state.error,
        state.language,
        state.range,
        state.labels.title,
      ]);
      this.state = state;
    },
    hide() {
      calls.push(["hide"]);
    },
    destroy() {
      calls.push(["destroy"]);
    },
    contains(target) {
      return target === containedTarget;
    },
    setContainedTarget(target) {
      containedTarget = target;
    },
  };
}

function createDismissDocument() {
  const listeners = new Map();
  return {
    body: {
      appendChild() {},
    },
    documentElement: {
      clientWidth: 1000,
      clientHeight: 800,
    },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
    emit(type, event = {}) {
      listeners.get(type)?.(event);
    },
  };
}

function createEditor({ href = "", setLinkResult = true, unsetLinkResult = true } = {}) {
  const calls = [];
  return {
    calls,
    getAttributes(name) {
      calls.push(["getAttributes", name]);
      return { href };
    },
    commands: {
      focus: () => calls.push(["focus"]),
      setTextSelection: (range) => {
        calls.push(["setTextSelection", range]);
        return true;
      },
      setLink: (attrs) => {
        calls.push(["setLink", attrs]);
        return setLinkResult;
      },
      unsetLink: () => {
        calls.push(["unsetLink"]);
        return unsetLinkResult;
      },
    },
    view: {
      coordsAtPos: (pos) => ({
        left: pos * 10,
        right: pos * 10 + 2,
        top: 80,
        bottom: 100,
      }),
      dom: {
        ownerDocument: {
          documentElement: {
            clientWidth: 1000,
            clientHeight: 800,
          },
        },
      },
    },
  };
}

test("Tiptap link editor opens with the active link href", () => {
  const editor = createEditor({ href: "https://example.com" });
  const view = createViewSpy();
  const controller = createTiptapLinkEditorController({ view });

  controller.attach({ editor, root: { className: "root" }, entry: { viewMode: "hybrid" } });

  assert.equal(
    controller.open({
      editor,
      entry: { viewMode: "hybrid", preferences: { language: "zh-CN" } },
      range: { from: 2, to: 8 },
    }),
    true,
  );

  assert.equal(controller.state.open, true);
  assert.equal(controller.state.href, "https://example.com");
  assert.deepEqual(editor.calls, [["getAttributes", "link"]]);
  assert.deepEqual(view.calls, [
    ["mount", "root"],
    ["update", "https://example.com", "", "zh-CN", { from: 2, to: 8 }, "编辑链接"],
  ]);
});

test("Tiptap link editor applies a link after restoring selection", () => {
  const editor = createEditor();
  const view = createViewSpy();
  const controller = createTiptapLinkEditorController({ view });

  controller.open({
    editor,
    entry: { viewMode: "hybrid" },
    range: { from: 3, to: 9 },
  });
  assert.equal(controller.apply(" https://tiptap.dev "), true);

  assert.equal(controller.state.open, false);
  assert.deepEqual(editor.calls, [
    ["getAttributes", "link"],
    ["setTextSelection", { from: 3, to: 9 }],
    ["setLink", { href: "https://tiptap.dev" }],
    ["focus"],
  ]);
  assert.deepEqual(view.calls.slice(-1), [["hide"]]);
});

test("Tiptap link editor removes links when submitted href is empty", () => {
  const editor = createEditor({ href: "https://example.com" });
  const controller = createTiptapLinkEditorController({ view: createViewSpy() });

  controller.open({
    editor,
    entry: { viewMode: "hybrid" },
    range: { from: 4, to: 12 },
  });
  assert.equal(controller.apply("   "), true);

  assert.deepEqual(editor.calls, [
    ["getAttributes", "link"],
    ["setTextSelection", { from: 4, to: 12 }],
    ["unsetLink"],
    ["focus"],
  ]);
});

test("Tiptap link editor keeps invalid links open with localized error text", () => {
  const editor = createEditor({ setLinkResult: false });
  const view = createViewSpy();
  const controller = createTiptapLinkEditorController({ view });

  controller.open({
    editor,
    entry: { viewMode: "hybrid", preferences: { language: "zh-CN" } },
    range: { from: 5, to: 11 },
  });
  assert.equal(controller.apply("not allowed"), false);

  assert.equal(controller.state.open, true);
  assert.equal(controller.state.href, "not allowed");
  assert.match(controller.state.error, /请输入/u);
  assert.deepEqual(editor.calls, [
    ["getAttributes", "link"],
    ["setTextSelection", { from: 5, to: 11 }],
    ["setLink", { href: "not allowed" }],
  ]);
  assert.equal(view.calls.at(-1)[1], "not allowed");
  assert.match(view.calls.at(-1)[2], /请输入/u);
});

test("Tiptap link editor closes on outside pointer events", () => {
  const editor = createEditor();
  const view = createViewSpy();
  const documentRef = createDismissDocument();
  const controller = createTiptapLinkEditorController({
    view,
    dom: { document: documentRef },
  });

  controller.open({
    editor,
    entry: { viewMode: "hybrid" },
    range: { from: 1, to: 2 },
  });
  documentRef.emit("pointerdown", { target: { id: "outside" } });

  assert.equal(controller.state.open, false);
  assert.deepEqual(view.calls.at(-1), ["hide"]);
});

test("Tiptap link editor reports contained overlay targets", () => {
  const view = createViewSpy();
  const target = { id: "inside-link-editor" };
  view.setContainedTarget(target);
  const controller = createTiptapLinkEditorController({ view });

  assert.equal(controller.contains(target), true);
});
