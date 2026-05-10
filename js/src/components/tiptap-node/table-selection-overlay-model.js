export const PAPYRO_TABLE_SELECTED_CELL_CLASS = "mn-tiptap-table-cell-selected";

export const TABLE_SELECTION_OVERLAY_MODE = Object.freeze({
  HIDDEN: "hidden",
  CELL_SELECTION: "cell-selection",
  VISUAL_CELL_SELECTION: "visual-cell-selection",
});

export const TABLE_SELECTION_OVERLAY_SCOPE = Object.freeze({
  HIDDEN: "hidden",
  CELL: "cell",
  CELLS: "cells",
  ROW: "row",
  COLUMN: "column",
  TABLE: "table",
});

export function findPapyroSelectedTableCell(tableDom) {
  return findPapyroSelectedTableCells(tableDom)[0] ?? null;
}

export function findPapyroSelectedTableCells(tableDom) {
  if (!tableDom) return [];

  try {
    const selectedCells = Array.from(
      tableDom.querySelectorAll?.(`.${PAPYRO_TABLE_SELECTED_CELL_CLASS}`) ?? [],
    );
    if (selectedCells.length > 0) return selectedCells;
    const selectedCell = tableDom.querySelector?.(`.${PAPYRO_TABLE_SELECTED_CELL_CLASS}`) ?? null;
    return selectedCell ? [selectedCell] : [];
  } catch (_error) {
    return [];
  }
}

export function tableSelectionOverlayMode({
  selection = null,
  CellSelectionClass = null,
  tableDom = null,
} = {}) {
  if (
    typeof CellSelectionClass === "function" &&
    selection instanceof CellSelectionClass
  ) {
    return TABLE_SELECTION_OVERLAY_MODE.CELL_SELECTION;
  }

  if (findPapyroSelectedTableCell(tableDom)) {
    return TABLE_SELECTION_OVERLAY_MODE.VISUAL_CELL_SELECTION;
  }

  return TABLE_SELECTION_OVERLAY_MODE.HIDDEN;
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function tableRectSpan(selectionRect, tableWidth, tableHeight) {
  const width = positiveInteger(tableWidth);
  const height = positiveInteger(tableHeight);
  if (!selectionRect || !width || !height) return null;

  const left = Number(selectionRect.left);
  const right = Number(selectionRect.right);
  const top = Number(selectionRect.top);
  const bottom = Number(selectionRect.bottom);
  if (![left, right, top, bottom].every(Number.isFinite)) return null;

  return {
    selectedColumns: Math.max(0, right - left),
    selectedRows: Math.max(0, bottom - top),
    coversAllColumns: left <= 0 && right >= width,
    coversAllRows: top <= 0 && bottom >= height,
  };
}

export function tableSelectionOverlayScope({
  mode = TABLE_SELECTION_OVERLAY_MODE.HIDDEN,
  selectedCellCount = 0,
  selectionRect = null,
  tableWidth = null,
  tableHeight = null,
} = {}) {
  if (mode === TABLE_SELECTION_OVERLAY_MODE.HIDDEN) {
    return TABLE_SELECTION_OVERLAY_SCOPE.HIDDEN;
  }

  const count = Math.max(0, Number(selectedCellCount) || 0);

  if (mode === TABLE_SELECTION_OVERLAY_MODE.VISUAL_CELL_SELECTION) {
    return count > 1
      ? TABLE_SELECTION_OVERLAY_SCOPE.CELLS
      : TABLE_SELECTION_OVERLAY_SCOPE.CELL;
  }

  if (mode !== TABLE_SELECTION_OVERLAY_MODE.CELL_SELECTION) {
    return TABLE_SELECTION_OVERLAY_SCOPE.HIDDEN;
  }

  const span = tableRectSpan(selectionRect, tableWidth, tableHeight);
  if (span) {
    const { selectedRows, selectedColumns, coversAllRows, coversAllColumns } = span;
    if (coversAllRows && coversAllColumns) {
      return TABLE_SELECTION_OVERLAY_SCOPE.TABLE;
    }
    if (coversAllColumns && selectedRows > 0) {
      return TABLE_SELECTION_OVERLAY_SCOPE.ROW;
    }
    if (coversAllRows && selectedColumns > 0) {
      return TABLE_SELECTION_OVERLAY_SCOPE.COLUMN;
    }
    if (selectedRows * selectedColumns > 1) {
      return TABLE_SELECTION_OVERLAY_SCOPE.CELLS;
    }
  }

  return count > 1
    ? TABLE_SELECTION_OVERLAY_SCOPE.CELLS
    : TABLE_SELECTION_OVERLAY_SCOPE.CELL;
}

export function tableSelectionOverlayAllowsCellMenu(scope) {
  return (
    scope === TABLE_SELECTION_OVERLAY_SCOPE.CELL ||
    scope === TABLE_SELECTION_OVERLAY_SCOPE.CELLS
  );
}
