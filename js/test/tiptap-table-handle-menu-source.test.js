import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const cellMenuSource = readFileSync(
  new URL("../src/components/tiptap-node/table-cell-handle-menu.jsx", import.meta.url),
  "utf8",
);
const axisMenuSource = readFileSync(
  new URL("../src/components/tiptap-node/table-handle-menu.jsx", import.meta.url),
  "utf8",
);
const cellMenuShimSource = readFileSync(
  new URL("../src/components/tiptap-node/table-node/ui/table-cell-handle-menu/index.jsx", import.meta.url),
  "utf8",
);
const axisMenuShimSource = readFileSync(
  new URL("../src/components/tiptap-node/table-node/ui/table-handle-menu/index.jsx", import.meta.url),
  "utf8",
);
const officialLayerSource = readFileSync(
  new URL("../src/tiptap-react/official-table-node-layer.jsx", import.meta.url),
  "utf8",
);

test("visible cell handle menu uses Papyro table command model instead of generic color menu", () => {
  assert.match(cellMenuSource, /createTableCellHandleCommandMenuModel/u);
  assert.match(cellMenuSource, /PapyroTableCommandMenuContent/u);
  assert.doesNotMatch(cellMenuSource, /ColorMenu/u);
  assert.doesNotMatch(cellMenuSource, /TableAlignMenu/u);
  assert.doesNotMatch(cellMenuSource, /useTableClearRowColumnContent/u);
  assert.doesNotMatch(cellMenuSource, /useTableMergeSplitCell/u);
});

test("visible row and column handle menu uses Papyro table command model", () => {
  assert.match(axisMenuSource, /createPapyroTableCommandMenuModel/u);
  assert.match(axisMenuSource, /selectionKind: orientation/u);
  assert.match(axisMenuSource, /PapyroTableCommandMenuContent/u);
  assert.doesNotMatch(axisMenuSource, /ColorMenu/u);
  assert.doesNotMatch(axisMenuSource, /TableAlignMenu/u);
  assert.doesNotMatch(axisMenuSource, /useTableClearRowColumnContent/u);
});

test("official table-node duplicate menu paths re-export the Papyro-owned implementations", () => {
  assert.match(cellMenuShimSource, /from "@\/components\/tiptap-node\/table-cell-handle-menu\.jsx"/u);
  assert.match(axisMenuShimSource, /from "@\/components\/tiptap-node\/table-handle-menu\.jsx"/u);
});

test("official table node layer passes runtime language and selection scope to table menus", () => {
  assert.match(officialLayerSource, /language=\{language\}/u);
  assert.match(officialLayerSource, /selectionKind=\{props\.selectionKind\}/u);
  assert.match(officialLayerSource, /<TableHandle editor=\{editor\} language=\{language\}/u);
});
