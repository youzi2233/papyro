import test from "node:test";
import assert from "node:assert/strict";

import {
  createTiptapBlockActionController,
  PAPYRO_TIPTAP_BLOCK_ACTIONS,
} from "../src/tiptap-block-actions.js";

function createEditor() {
  const calls = [];
  const editor = {
    commands: {
      deleteRange: (range) => {
        calls.push(["deleteRange", range.from, range.to]);
        return true;
      },
      focus: (pos) => {
        calls.push(["focus", pos ?? null]);
        return true;
      },
      insertContentAt: (pos, markdown, options) => {
        calls.push(["insertContentAt", pos, markdown, options.contentType]);
        return true;
      },
      setParagraph: () => {
        calls.push(["setParagraph"]);
        return true;
      },
      toggleHeading: (attrs) => {
        calls.push(["toggleHeading", attrs.level]);
        return true;
      },
    },
  };

  return { calls, editor };
}

test("Tiptap block actions expose stable command ids", () => {
  assert.deepEqual(
    PAPYRO_TIPTAP_BLOCK_ACTIONS.map((command) => command.id),
    ["insert-before", "insert-after", "paragraph", "heading-2", "delete"],
  );
});

test("Tiptap block actions insert paragraphs around the target block", () => {
  const { calls, editor } = createEditor();
  const controller = createTiptapBlockActionController();
  const target = { pos: 5, node: { nodeSize: 8 } };

  assert.deepEqual(controller.run("insert-after", { editor, target }), {
    ok: true,
    commandId: "insert-after",
    error: null,
  });
  assert.deepEqual(calls, [
    ["focus", 5],
    ["insertContentAt", 13, "\n", "markdown"],
    ["focus", null],
  ]);
});

test("Tiptap block actions transform the active block", () => {
  const { calls, editor } = createEditor();
  const controller = createTiptapBlockActionController();

  assert.equal(controller.run("heading-2", { editor, target: { pos: 3 } }).ok, true);
  assert.deepEqual(calls, [
    ["focus", 3],
    ["toggleHeading", 2],
    ["focus", null],
  ]);
});

test("Tiptap block actions delete the target range", () => {
  const { calls, editor } = createEditor();
  const controller = createTiptapBlockActionController();

  assert.equal(
    controller.run("delete", { editor, target: { pos: 2, node: { nodeSize: 6 } } }).ok,
    true,
  );
  assert.deepEqual(calls, [
    ["focus", 2],
    ["deleteRange", 2, 8],
    ["focus", null],
  ]);
});

test("Tiptap block actions report unknown commands", () => {
  const controller = createTiptapBlockActionController();

  assert.deepEqual(controller.run("unknown"), {
    ok: false,
    commandId: "unknown",
    error: "unknown_block_action",
  });
});
