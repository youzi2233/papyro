import test from "node:test";
import assert from "node:assert/strict";

import { createTiptapBlockActionMenuController } from "../src/tiptap-block-action-menu.js";

function createTarget() {
  return {
    kind: "paragraph",
    pos: 4,
    node: { nodeSize: 6 },
    block: {
      getBoundingClientRect: () => ({ left: 120, top: 80, width: 480, height: 30 }),
      ownerDocument: {
        documentElement: {
          clientWidth: 1000,
          clientHeight: 800,
        },
      },
    },
  };
}

function createEditor() {
  const calls = [];
  const editor = {
    commands: {
      focus: (pos) => calls.push(["focus", pos ?? null]),
      setParagraph: () => {
        calls.push(["setParagraph"]);
        return true;
      },
    },
  };
  return { calls, editor };
}

function createViewSpy() {
  const calls = [];
  return {
    calls,
    mount(root) {
      calls.push(["mount", root?.className ?? ""]);
    },
    update(state) {
      calls.push([
        "update",
        state.target.kind,
        state.commands.map((command) => command.id),
        state.selectedIndex,
      ]);
      this.run = state.run;
    },
    hide() {
      calls.push(["hide"]);
    },
    destroy() {
      calls.push(["destroy"]);
    },
  };
}

test("Tiptap block action menu opens for Hybrid block targets", () => {
  const { editor } = createEditor();
  const view = createViewSpy();
  const controller = createTiptapBlockActionMenuController({ view });
  controller.attach({ editor, root: { className: "root" }, entry: { viewMode: "hybrid" } });

  controller.open(createTarget());

  assert.equal(controller.state.open, true);
  assert.deepEqual(
    controller.state.commands.map((command) => command.id),
    ["insert-before", "insert-after", "paragraph", "heading-2", "delete"],
  );
  assert.deepEqual(view.calls[0], ["mount", "root"]);
  assert.equal(view.calls[1][0], "update");
});

test("Tiptap block action menu stays closed outside Hybrid mode", () => {
  const { editor } = createEditor();
  const view = createViewSpy();
  const controller = createTiptapBlockActionMenuController({ view });
  controller.attach({ editor, root: {}, entry: { viewMode: "preview" } });

  controller.open(createTarget());

  assert.equal(controller.state.open, false);
  assert.deepEqual(view.calls, [["mount", ""]]);
});

test("Tiptap block action menu supports keyboard selection", () => {
  const { editor } = createEditor();
  const view = createViewSpy();
  const controller = createTiptapBlockActionMenuController({ view });
  controller.attach({ editor, root: {}, entry: { viewMode: "hybrid" } });
  controller.open(createTarget());

  controller.handleKeyDown({ key: "ArrowDown", preventDefault() {} });

  assert.equal(controller.state.selectedIndex, 1);
  assert.equal(view.calls.at(-1)[3], 1);
});

test("Tiptap block action menu runs the selected command", () => {
  const { calls, editor } = createEditor();
  const view = createViewSpy();
  const controller = createTiptapBlockActionMenuController({ view });
  controller.attach({ editor, root: {}, entry: { viewMode: "hybrid" } });
  controller.open(createTarget());
  controller.moveSelection(2);

  assert.equal(controller.handleKeyDown({ key: "Enter", preventDefault() {} }), true);

  assert.equal(controller.state.open, false);
  assert.deepEqual(calls, [
    ["focus", 4],
    ["setParagraph"],
    ["focus", null],
  ]);
  assert.deepEqual(view.calls.at(-1), ["hide"]);
});

test("Tiptap block action menu closes on Escape", () => {
  const { editor } = createEditor();
  const view = createViewSpy();
  const controller = createTiptapBlockActionMenuController({ view });
  controller.attach({ editor, root: {}, entry: { viewMode: "hybrid" } });
  controller.open(createTarget());

  assert.equal(controller.handleKeyDown({ key: "Escape", preventDefault() {} }), true);

  assert.equal(controller.state.open, false);
  assert.deepEqual(view.calls.at(-1), ["hide"]);
});
