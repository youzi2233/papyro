import test from "node:test";
import assert from "node:assert/strict";
import { Editor } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { Window } from "happy-dom";

import {
  PapyroTableCellBackground,
  PapyroTableCellContentActions,
  createPapyroTableExtensions,
} from "../src/tiptap-table.js";

function installDomGlobals(windowRef) {
  const previous = new Map();
  for (const [name, value] of Object.entries({
    window: windowRef,
    document: windowRef.document,
    navigator: windowRef.navigator,
    HTMLElement: windowRef.HTMLElement,
    Element: windowRef.Element,
    Document: windowRef.Document,
    Node: windowRef.Node,
    DOMParser: windowRef.DOMParser,
    getComputedStyle: windowRef.getComputedStyle.bind(windowRef),
    innerHeight: 900,
    innerWidth: 1200,
  })) {
    previous.set(name, {
      exists: Object.prototype.hasOwnProperty.call(globalThis, name),
      value: globalThis[name],
    });
    globalThis[name] = value;
  }
  return previous;
}

function restoreDomGlobals(previous) {
  for (const [name, record] of previous.entries()) {
    if (record.exists) {
      globalThis[name] = record.value;
    } else {
      delete globalThis[name];
    }
  }
}

function tableCellPositions(doc) {
  const positions = [];
  doc?.descendants?.((node, pos) => {
    if (node?.type?.name === "tableCell" || node?.type?.name === "tableHeader") {
      positions.push(pos);
    }
  });
  return positions;
}

test("Papyro table extensions expose the TableKit boundary", () => {
  const extensions = createPapyroTableExtensions();

  assert.deepEqual(
    extensions.map((extension) => extension.name),
    ["tableKit", "papyroTableCellBackground", "papyroTableCellContentActions"],
  );
  assert.equal(extensions[0].options.table.resizable, true);
  assert.equal(extensions[0].options.table.handleWidth, 6);
  assert.equal(extensions[0].options.table.cellMinWidth, 96);
  assert.equal(extensions[0].options.table.lastColumnResizable, true);
  assert.equal(extensions[0].options.table.allowTableNodeSelection, false);
});

test("Papyro table cell background extension adds cell attributes", () => {
  const [config] = PapyroTableCellBackground.config.addGlobalAttributes();
  const background = config.attributes.backgroundColor;
  const element = {
    style: { backgroundColor: "rgb(245, 158, 11)" },
    getAttribute(name) {
      return name === "data-cell-background" ? "rgba(245, 158, 11, 0.16)" : null;
    },
  };

  assert.deepEqual(config.types, ["tableCell", "tableHeader"]);
  assert.equal(background.default, null);
  assert.equal(background.parseHTML(element), "rgba(245, 158, 11, 0.16)");
  assert.deepEqual(background.renderHTML({ backgroundColor: "rgba(16, 185, 129, 0.14)" }), {
    "data-cell-background": "rgba(16, 185, 129, 0.14)",
    style: "background-color: rgba(16, 185, 129, 0.14)",
  });
  assert.deepEqual(background.renderHTML({ backgroundColor: null }), {});
});

test("Papyro table content actions clear selected cell contents through ProseMirror tables", () => {
  const windowRef = new Window({ url: "http://localhost/" });
  const previousGlobals = installDomGlobals(windowRef);
  const root = windowRef.document.createElement("div");
  windowRef.document.body.appendChild(root);
  let editor = null;

  try {
    editor = new Editor({
      element: root,
      extensions: [StarterKit, ...createPapyroTableExtensions()],
      content:
        "<table><tbody><tr><td>Alpha</td><td>Beta</td></tr><tr><td>Gamma</td><td>Delta</td></tr></tbody></table>",
      injectCSS: false,
    });
    const [anchorCell, headCell] = tableCellPositions(editor.state.doc);

    assert.equal(typeof editor.commands.clearSelectedTableCells, "function");
    assert.equal(
      editor.commands.setCellSelection({ anchorCell, headCell }),
      true,
    );
    assert.equal(editor.commands.clearSelectedTableCells(), true);
    assert.deepEqual(
      Array.from(editor.view.dom.querySelectorAll("td,th")).map((cell) => cell.textContent),
      ["", "", "Gamma", "Delta"],
    );
  } finally {
    editor?.destroy?.();
    restoreDomGlobals(previousGlobals);
    windowRef.close?.();
  }
});

test("Papyro table content actions expose the expected command name", () => {
  const commands = PapyroTableCellContentActions.config.addCommands();

  assert.equal(typeof commands.clearSelectedTableCells, "function");
});
