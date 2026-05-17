import test from "node:test";
import assert from "node:assert/strict";
import { Editor } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { TextSelection, NodeSelection } from "@tiptap/pm/state";

import { collapseFormattingSelection } from "../src/lib/tiptap-utils.ts";
import { createTiptapFormatCommandController } from "../src/tiptap-format-commands.ts";
import { createPapyroTableExtensions } from "../src/tiptap-table.ts";
import { importBundledModule } from "./helpers/load-esbuild-module.js";

const { createTiptapBlockActionController } = await importBundledModule(
  new URL("../src/tiptap-block-actions.ts", import.meta.url),
);

function createEditor(content: Record<string, unknown>, extensions = []) {
  return new Editor({
    extensions: [StarterKit, TextStyle, Color, ...extensions],
    content,
    injectCSS: false,
  });
}

test("formatting selection collapse reveals styled heading text after color application", () => {
  const editor = createEditor({
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: "Roadmap" }],
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "Next" }],
      },
    ],
  });

  try {
    editor.view.dispatch(
      editor.state.tr.setSelection(TextSelection.create(editor.state.doc, 1, 8))
    );
    assert.equal(editor.commands.setColor("var(--mn-accent)"), true);
    assert.equal(collapseFormattingSelection(editor), true);

    assert.equal(editor.state.selection.empty, true);
    assert.equal(editor.state.selection.from, 8);
    const mark = editor.getJSON().content?.[0].content?.[0].marks?.[0];
    assert.equal(mark?.type, "textStyle");
    assert.equal(mark?.attrs?.color, "var(--mn-accent)");
  } finally {
    editor.destroy();
  }
});

test("formatting selection collapse does not clear whole-table cell selections", () => {
  const editor = createEditor(
    {
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                {
                  type: "tableCell",
                  attrs: {
                    align: null,
                    backgroundColor: null,
                    verticalAlign: null,
                    colspan: 1,
                    rowspan: 1,
                    colwidth: null,
                  },
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "A" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    createPapyroTableExtensions()
  );

  try {
    let cellPos = -1;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "tableCell") {
        cellPos = pos;
        return false;
      }
      return true;
    });

    assert.equal(editor.commands.setCellSelection({ anchorCell: cellPos, headCell: cellPos }), true);
    assert.equal(collapseFormattingSelection(editor), false);
    assert.equal(typeof editor.state.selection.forEachCell, "function");
  } finally {
    editor.destroy();
  }
});

test("formatting selection collapse folds textblock node selections to a caret", () => {
  const editor = createEditor({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Alpha" }],
      },
    ],
  });

  try {
    editor.view.dispatch(
      editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, 0))
    );

    assert.equal(collapseFormattingSelection(editor), true);
    assert.equal(editor.state.selection.empty, true);
  } finally {
    editor.destroy();
  }
});

test("format command colors collapse a selected heading after applying text color", () => {
  const editor = createEditor({
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Strategy" }],
      },
    ],
  });
  const controller = createTiptapFormatCommandController();

  try {
    editor.view.dispatch(
      editor.state.tr.setSelection(TextSelection.create(editor.state.doc, 1, 9))
    );

    assert.equal(controller.run("text-color-accent", { editor }).ok, true);
    assert.equal(editor.state.selection.empty, true);
    assert.equal(editor.state.selection.from, 9);
    const mark = editor.getJSON().content?.[0].content?.[0].marks?.[0];
    assert.equal(mark?.type, "textStyle");
    assert.equal(mark?.attrs?.color, "var(--mn-accent)");
  } finally {
    editor.destroy();
  }
});

test("block action colors collapse a selected heading after styling the block", () => {
  const editor = createEditor({
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Signals" }],
      },
    ],
  });
  const controller = createTiptapBlockActionController();

  try {
    editor.view.dispatch(
      editor.state.tr.setSelection(TextSelection.create(editor.state.doc, 1, 8))
    );

    assert.equal(
      controller.run("text-color-accent", {
        editor,
        target: { pos: 0, node: editor.state.doc.nodeAt(0) },
      }).ok,
      true
    );
    assert.equal(editor.state.selection.empty, true);
    assert.equal(editor.state.selection.from, 8);
    const mark = editor.getJSON().content?.[0].content?.[0].marks?.[0];
    assert.equal(mark?.type, "textStyle");
    assert.equal(mark?.attrs?.color, "var(--mn-accent)");
  } finally {
    editor.destroy();
  }
});
