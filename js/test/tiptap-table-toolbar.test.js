import test from "node:test";
import assert from "node:assert/strict";

import { createTiptapTableToolbarController } from "../src/tiptap-table-toolbar.js";

function createTableHarness() {
  const calls = [];
  const table = {
    className: "mn-tiptap-table",
    getBoundingClientRect: () => ({ left: 120, top: 90, right: 520, bottom: 220 }),
    ownerDocument: {
      documentElement: {
        clientWidth: 1000,
        clientHeight: 800,
      },
    },
  };
  const cell = {
    nodeType: 1,
    parentElement: table,
    closest(selector) {
      return selector.includes("table") ? table : null;
    },
  };
  const root = {
    contains: (target) => target === table || target === cell,
  };
  const editor = {
    state: {
      selection: {
        from: 4,
      },
    },
    view: {
      dom: root,
      domAtPos() {
        return { node: cell };
      },
    },
    commands: {
      addColumnBefore: () => {
        calls.push(["addColumnBefore"]);
        return true;
      },
      deleteTable: () => {
        calls.push(["deleteTable"]);
        return true;
      },
      focus: () => calls.push(["focus"]),
    },
  };

  return { calls, editor, table };
}

function createViewSpy() {
  const calls = [];
  return {
    calls,
    mount(root) {
      calls.push(["mount", root?.className ?? ""]);
    },
    update(state) {
      calls.push(["update", state.commands.map((command) => command.id)]);
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

test("Tiptap table toolbar opens when the selection is inside a table", () => {
  const { editor } = createTableHarness();
  const view = createViewSpy();
  const controller = createTiptapTableToolbarController({ view });
  controller.attach({ editor, root: { className: "runtime" }, entry: { viewMode: "hybrid" } });

  assert.equal(controller.state.open, true);
  assert.deepEqual(controller.state.commands.map((command) => command.id), [
    "add-column-before",
    "delete-table",
  ]);
  assert.deepEqual(view.calls, [
    ["mount", "runtime"],
    ["update", ["add-column-before", "delete-table"]],
  ]);
});

test("Tiptap table toolbar runs table commands and restores focus", () => {
  const { calls, editor } = createTableHarness();
  const view = createViewSpy();
  const controller = createTiptapTableToolbarController({ view });
  controller.attach({ editor, root: {}, entry: { viewMode: "hybrid" } });

  assert.equal(controller.run("delete-table"), true);

  assert.deepEqual(calls, [["deleteTable"], ["focus"]]);
});

test("Tiptap table toolbar stays closed outside Hybrid mode", () => {
  const { editor } = createTableHarness();
  const view = createViewSpy();
  const controller = createTiptapTableToolbarController({ view });
  controller.attach({ editor, root: {}, entry: { viewMode: "preview" } });

  assert.equal(controller.state.open, false);
  assert.deepEqual(view.calls, [["mount", ""]]);
});
