import test from "node:test";
import assert from "node:assert/strict";

import {
  findPapyroSelectedTableCell,
  findPapyroSelectedTableCells,
  PAPYRO_TABLE_SELECTED_CELL_CLASS,
  tableSelectionOverlayAllowsCellMenu,
  tableSelectionOverlayMode,
  tableSelectionOverlayScope,
  TABLE_SELECTION_OVERLAY_MODE,
  TABLE_SELECTION_OVERLAY_SCOPE,
} from "../src/components/tiptap-node/table-selection-overlay-model.js";

class FakeCellSelection {}

function createTableDom(selectedCell = null) {
  return {
    querySelector(selector) {
      assert.equal(selector, `.${PAPYRO_TABLE_SELECTED_CELL_CLASS}`);
      return selectedCell;
    },
  };
}

test("table selection overlay stays hidden for an ordinary text caret in a cell", () => {
  const mode = tableSelectionOverlayMode({
    selection: { from: 12, to: 12 },
    CellSelectionClass: FakeCellSelection,
    tableDom: createTableDom(null),
  });

  assert.equal(mode, TABLE_SELECTION_OVERLAY_MODE.HIDDEN);
});

test("table selection overlay follows Papyro visual cell selection", () => {
  const selectedCell = { tagName: "TD" };
  const tableDom = createTableDom(selectedCell);

  assert.equal(findPapyroSelectedTableCell(tableDom), selectedCell);
  assert.deepEqual(findPapyroSelectedTableCells(tableDom), [selectedCell]);
  assert.equal(
    tableSelectionOverlayMode({
      selection: { from: 12, to: 12 },
      CellSelectionClass: FakeCellSelection,
      tableDom,
    }),
    TABLE_SELECTION_OVERLAY_MODE.VISUAL_CELL_SELECTION,
  );
});

test("table selection overlay keeps ProseMirror CellSelection as the strongest signal", () => {
  const mode = tableSelectionOverlayMode({
    selection: new FakeCellSelection(),
    CellSelectionClass: FakeCellSelection,
    tableDom: createTableDom({ tagName: "TD" }),
  });

  assert.equal(mode, TABLE_SELECTION_OVERLAY_MODE.CELL_SELECTION);
});

test("table selection overlay scopes menu ownership to cell selections", () => {
  assert.equal(
    tableSelectionOverlayScope({
      mode: TABLE_SELECTION_OVERLAY_MODE.HIDDEN,
    }),
    TABLE_SELECTION_OVERLAY_SCOPE.HIDDEN,
  );
  assert.equal(
    tableSelectionOverlayScope({
      mode: TABLE_SELECTION_OVERLAY_MODE.VISUAL_CELL_SELECTION,
      selectedCellCount: 1,
    }),
    TABLE_SELECTION_OVERLAY_SCOPE.CELL,
  );
  assert.equal(
    tableSelectionOverlayScope({
      mode: TABLE_SELECTION_OVERLAY_MODE.VISUAL_CELL_SELECTION,
      selectedCellCount: 2,
    }),
    TABLE_SELECTION_OVERLAY_SCOPE.CELLS,
  );
  assert.equal(
    tableSelectionOverlayScope({
      mode: TABLE_SELECTION_OVERLAY_MODE.CELL_SELECTION,
      selectedCellCount: 2,
      selectionRect: { left: 0, right: 3, top: 1, bottom: 2 },
      tableWidth: 3,
      tableHeight: 4,
    }),
    TABLE_SELECTION_OVERLAY_SCOPE.ROW,
  );
  assert.equal(
    tableSelectionOverlayScope({
      mode: TABLE_SELECTION_OVERLAY_MODE.CELL_SELECTION,
      selectedCellCount: 2,
      selectionRect: { left: 1, right: 2, top: 0, bottom: 4 },
      tableWidth: 3,
      tableHeight: 4,
    }),
    TABLE_SELECTION_OVERLAY_SCOPE.COLUMN,
  );
  assert.equal(
    tableSelectionOverlayScope({
      mode: TABLE_SELECTION_OVERLAY_MODE.CELL_SELECTION,
      selectedCellCount: 12,
      selectionRect: { left: 0, right: 3, top: 0, bottom: 4 },
      tableWidth: 3,
      tableHeight: 4,
    }),
    TABLE_SELECTION_OVERLAY_SCOPE.TABLE,
  );
  assert.equal(
    tableSelectionOverlayScope({
      mode: TABLE_SELECTION_OVERLAY_MODE.CELL_SELECTION,
      selectedCellCount: 2,
      selectionRect: { left: 0, right: 2, top: 0, bottom: 1 },
      tableWidth: 3,
      tableHeight: 4,
    }),
    TABLE_SELECTION_OVERLAY_SCOPE.CELLS,
  );

  assert.equal(tableSelectionOverlayAllowsCellMenu(TABLE_SELECTION_OVERLAY_SCOPE.CELL), true);
  assert.equal(tableSelectionOverlayAllowsCellMenu(TABLE_SELECTION_OVERLAY_SCOPE.CELLS), true);
  assert.equal(tableSelectionOverlayAllowsCellMenu(TABLE_SELECTION_OVERLAY_SCOPE.ROW), false);
  assert.equal(tableSelectionOverlayAllowsCellMenu(TABLE_SELECTION_OVERLAY_SCOPE.COLUMN), false);
  assert.equal(tableSelectionOverlayAllowsCellMenu(TABLE_SELECTION_OVERLAY_SCOPE.TABLE), false);
});
