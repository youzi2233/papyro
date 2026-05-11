import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const officialCellMenuSource = readFileSync(
  new URL("../src/components/tiptap-node/table-node/ui/table-cell-handle-menu/index.jsx", import.meta.url),
  "utf8",
);
const officialAxisMenuSource = readFileSync(
  new URL("../src/components/tiptap-node/table-node/ui/table-handle-menu/index.jsx", import.meta.url),
  "utf8",
);
const tableHandleSource = readFileSync(
  new URL("../src/components/tiptap-node/table-handle.jsx", import.meta.url),
  "utf8",
);
const officialLayerSource = readFileSync(
  new URL("../src/tiptap-react/official-table-node-layer.jsx", import.meta.url),
  "utf8",
);

const cellMenuRenderSource =
  officialLayerSource.match(/<TableCellHandleMenu[\s\S]*?\/>/u)?.[0] ?? "";

test("official paid table-node cell menu remains the visible runtime source", () => {
  assert.match(officialCellMenuSource, /useTableMergeSplitCell/u);
  assert.match(officialCellMenuSource, /useTableClearRowColumnContent/u);
  assert.match(officialCellMenuSource, /ColorMenu/u);
  assert.match(officialCellMenuSource, /TableAlignMenu/u);
  assert.doesNotMatch(officialCellMenuSource, /PapyroTableCommandMenuContent/u);
  assert.doesNotMatch(officialCellMenuSource, /createTableCellHandleCommandMenuModel/u);
  assert.doesNotMatch(officialCellMenuSource, /from "@\/components\/tiptap-node\/table-cell-handle-menu\.jsx"/u);
});

test("official paid table-node row and column menus remain the visible runtime source", () => {
  assert.match(officialAxisMenuSource, /useTableDuplicateRowColumn/u);
  assert.match(officialAxisMenuSource, /useTableMoveRowColumn/u);
  assert.match(officialAxisMenuSource, /useTableClearRowColumnContent/u);
  assert.match(officialAxisMenuSource, /ColorMenu/u);
  assert.match(officialAxisMenuSource, /TableAlignMenu/u);
  assert.doesNotMatch(officialAxisMenuSource, /PapyroTableCommandMenuContent/u);
  assert.doesNotMatch(officialAxisMenuSource, /createPapyroTableCommandMenuModel/u);
  assert.doesNotMatch(officialAxisMenuSource, /from "@\/components\/tiptap-node\/table-handle-menu\.jsx"/u);
});

test("Papyro table layer mounts official table-node menu paths", () => {
  assert.match(
    officialLayerSource,
    /from "\.\.\/components\/tiptap-node\/table-node\/ui\/table-cell-handle-menu\/index\.jsx"/u,
  );
  assert.doesNotMatch(
    officialLayerSource,
    /from "\.\.\/components\/tiptap-node\/table-cell-handle-menu\.jsx"/u,
  );
  assert.match(
    tableHandleSource,
    /from "@\/components\/tiptap-node\/table-node\/ui\/table-handle-menu"/u,
  );
});

test("Papyro keeps local adaptation outside official table-node cell menu props", () => {
  assert.doesNotMatch(cellMenuRenderSource, /selectionKind=\{props\.selectionKind\}/u);
  assert.doesNotMatch(cellMenuRenderSource, /language=\{language\}/u);
  assert.match(officialLayerSource, /<TableHandle editor=\{editor\} language=\{language\}/u);
});
