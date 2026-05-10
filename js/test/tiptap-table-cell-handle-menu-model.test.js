import test from "node:test";
import assert from "node:assert/strict";

import {
  createPapyroTableCommandMenuModel,
  createTableCellHandleCommandMenuModel,
  normalizePapyroTableMenuSelectionKind,
  normalizeTableCellMenuSelectionKind,
} from "../src/components/tiptap-node/table-cell-handle-menu-model.js";

function fakeEditor() {
  const commandHandler = () => true;
  const commandMap = new Proxy(
    {},
    {
      get(_target, prop) {
        return prop === "focus" ? commandHandler : commandHandler;
      },
    },
  );

  return {
    commands: commandMap,
    can() {
      return commandMap;
    },
  };
}

function commandIds(model) {
  return model.commands.map((command) => command.id);
}

function groupFor(model, layoutGroup) {
  return model.groups.find((group) => group.layoutGroup === layoutGroup);
}

test("table cell handle menu model keeps single cell and range scopes distinct", () => {
  const editor = fakeEditor();

  const cell = createTableCellHandleCommandMenuModel({
    editor,
    selectionKind: "cell",
  });
  assert.deepEqual(commandIds(cell), [
    "split-cell",
    "copy-cell-content",
    "clear-cell-content",
    "clear-cell-style",
    "align-left",
    "align-center",
    "align-right",
    "cell-text-clear",
    "cell-text-muted",
    "cell-text-accent",
    "cell-text-danger",
    "cell-bg-clear",
    "cell-bg-yellow",
    "cell-bg-blue",
    "cell-bg-green",
  ]);

  const cells = createTableCellHandleCommandMenuModel({
    editor,
    selectionKind: "cells",
  });
  assert.deepEqual(commandIds(cells), [
    "merge-cells",
    "copy-cell-content",
    "clear-cell-content",
    "clear-cell-style",
    "align-left",
    "align-center",
    "align-right",
    "cell-text-clear",
    "cell-text-muted",
    "cell-text-accent",
    "cell-text-danger",
    "cell-bg-clear",
    "cell-bg-yellow",
    "cell-bg-blue",
    "cell-bg-green",
  ]);

  assert.equal(groupFor(cells, "align")?.menuSection, "style");
  assert.equal(groupFor(cells, "text-color")?.menuSection, "style");
  assert.equal(groupFor(cells, "cell-color")?.menuSection, "style");
});

test("papyro table command menu model exposes row and column enterprise actions", () => {
  const editor = fakeEditor();

  const row = createPapyroTableCommandMenuModel({
    editor,
    selectionKind: "row",
  });
  assert.deepEqual(commandIds(row), [
    "move-row-up",
    "move-row-down",
    "add-row-after",
    "add-row-before",
    "duplicate-row",
    "toggle-header-row",
    "sort-columns-asc",
    "sort-columns-desc",
    "copy-cell-content",
    "clear-cell-content",
    "clear-cell-style",
    "align-left",
    "align-center",
    "align-right",
    "cell-text-clear",
    "cell-text-muted",
    "cell-text-accent",
    "cell-text-danger",
    "cell-bg-clear",
    "cell-bg-yellow",
    "cell-bg-blue",
    "cell-bg-green",
    "delete-row",
  ]);

  const column = createPapyroTableCommandMenuModel({
    editor,
    selectionKind: "column",
  });
  assert.deepEqual(commandIds(column), [
    "move-column-left",
    "move-column-right",
    "add-column-after",
    "add-column-before",
    "duplicate-column",
    "toggle-header-column",
    "sort-rows-asc",
    "sort-rows-desc",
    "copy-cell-content",
    "clear-cell-content",
    "clear-cell-style",
    "align-left",
    "align-center",
    "align-right",
    "cell-text-clear",
    "cell-text-muted",
    "cell-text-accent",
    "cell-text-danger",
    "cell-bg-clear",
    "cell-bg-yellow",
    "cell-bg-blue",
    "cell-bg-green",
    "delete-column",
  ]);
});

test("table menu selection kind normalizers prevent unsupported menu scopes", () => {
  assert.equal(normalizeTableCellMenuSelectionKind("cells"), "cells");
  assert.equal(normalizeTableCellMenuSelectionKind("row"), "cell");
  assert.equal(normalizePapyroTableMenuSelectionKind("row"), "row");
  assert.equal(normalizePapyroTableMenuSelectionKind("column"), "column");
  assert.equal(normalizePapyroTableMenuSelectionKind("table"), "table");
  assert.equal(normalizePapyroTableMenuSelectionKind("other"), "cell");
});
