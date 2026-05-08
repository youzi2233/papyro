import { TableKit } from "@tiptap/extension-table";
import { Extension } from "@tiptap/core";
import { deleteCellSelection } from "@tiptap/pm/tables";

export const PAPYRO_TABLE_CELL_RESET_ATTRS = Object.freeze([
  "align",
  "backgroundColor",
]);

function parseCellBackgroundColor(element) {
  return (
    element.getAttribute("data-cell-background") ||
    element.style.backgroundColor ||
    null
  );
}

function renderCellBackgroundColor(attributes) {
  if (!attributes.backgroundColor) return {};
  return {
    "data-cell-background": attributes.backgroundColor,
    style: `background-color: ${attributes.backgroundColor}`,
  };
}

function createPapyroCellAttributes() {
  return {
    backgroundColor: {
      default: null,
      parseHTML: parseCellBackgroundColor,
      renderHTML: renderCellBackgroundColor,
    },
  };
}

function resetTableCellAttrs(attrs, names = PAPYRO_TABLE_CELL_RESET_ATTRS) {
  const nextAttrs = { ...(attrs ?? {}) };
  let changed = false;

  names.forEach((name) => {
    if (nextAttrs[name] !== null && nextAttrs[name] !== undefined) {
      nextAttrs[name] = null;
      changed = true;
    }
  });

  return changed ? nextAttrs : null;
}

function isTextNode(node) {
  return node?.isText === true || node?.type?.name === "text" || node?.type === "text";
}

function selectedTableCellTextRanges(selection) {
  if (typeof selection?.forEachCell !== "function") return [];

  const ranges = [];
  selection.forEachCell((cell, cellPos) => {
    if (!cell || !Number.isFinite(cellPos)) return;
    if (isTextNode(cell)) {
      ranges.push({ from: cellPos, to: cellPos + Math.max(0, cell.nodeSize ?? 0) });
      return;
    }

    cell.descendants?.((node, offset) => {
      if (!isTextNode(node)) return true;

      const from = cellPos + 1 + offset;
      const to = from + Math.max(0, node.nodeSize ?? node.text?.length ?? 0);
      if (to > from) {
        ranges.push({ from, to });
      }
      return false;
    });
  });

  return ranges;
}

export function resetSelectedTableCellAttrs(selection, tr, names = PAPYRO_TABLE_CELL_RESET_ATTRS) {
  if (typeof selection?.forEachCell !== "function" || !tr) return false;

  let changed = false;
  selection.forEachCell((node, pos) => {
    const nextAttrs = resetTableCellAttrs(node?.attrs, names);
    if (!nextAttrs) return;
    const mappedPos = typeof tr.mapping?.map === "function" ? tr.mapping.map(pos) : pos;
    tr.setNodeMarkup(mappedPos, null, nextAttrs);
    changed = true;
  });
  return changed;
}

export function setSelectedTableCellTextColor(selection, tr, markType, color = null) {
  if (typeof selection?.forEachCell !== "function" || !tr || !markType) return false;

  const ranges = selectedTableCellTextRanges(selection);
  ranges.forEach(({ from, to }) => {
    tr.removeMark(from, to, markType);
    if (color) {
      tr.addMark(from, to, markType.create({ color }));
    }
  });

  return ranges.length > 0;
}

export const PapyroTableCellBackground = Extension.create({
  name: "papyroTableCellBackground",

  addGlobalAttributes() {
    return [
      {
        types: ["tableCell", "tableHeader"],
        attributes: createPapyroCellAttributes(),
      },
    ];
  },
});

export const PapyroTableCellContentActions = Extension.create({
  name: "papyroTableCellContentActions",

  addCommands() {
    return {
      clearSelectedTableCells:
        (options = {}) =>
        ({ state, dispatch }) => {
          const resetAttrs = Boolean(options?.resetAttrs);
          if (!resetAttrs) return deleteCellSelection(state, dispatch);
          if (!deleteCellSelection(state)) return false;
          if (!dispatch) return true;

          let clearTransaction = null;
          deleteCellSelection(state, (tr) => {
            clearTransaction = tr;
          });
          const tr = clearTransaction ?? state.tr;
          resetSelectedTableCellAttrs(state.selection, tr);
          if (tr.docChanged) dispatch(tr);
          return true;
        },
      resetSelectedTableCellAttrs:
        () =>
        ({ state, dispatch }) => {
          if (typeof state?.selection?.forEachCell !== "function") return false;
          if (!dispatch) return true;

          const markType = state.schema?.marks?.textStyle ?? null;
          const tr = state.tr;
          resetSelectedTableCellAttrs(state.selection, tr);
          setSelectedTableCellTextColor(state.selection, tr, markType, null);
          if (tr.docChanged) dispatch(tr);
          return true;
        },
      setSelectedTableCellTextColor:
        (color = null) =>
        ({ state, dispatch }) => {
          if (typeof state?.selection?.forEachCell !== "function") return false;
          const markType = state.schema?.marks?.textStyle ?? null;
          if (!markType) return false;
          if (dispatch) {
            const tr = state.tr;
            setSelectedTableCellTextColor(state.selection, tr, markType, color);
            if (tr.docChanged) dispatch(tr);
          }
          return true;
        },
    };
  },
});

export function createPapyroTableExtensions() {
  return [
    TableKit.configure({
      table: {
        HTMLAttributes: {
          class: "mn-tiptap-table",
        },
        resizable: true,
        handleWidth: 6,
        cellMinWidth: 96,
        lastColumnResizable: true,
        allowTableNodeSelection: false,
      },
      tableRow: {
        HTMLAttributes: {
          class: "mn-tiptap-table-row",
        },
      },
      tableHeader: {
        HTMLAttributes: {
          class: "mn-tiptap-table-header",
        },
      },
      tableCell: {
        HTMLAttributes: {
          class: "mn-tiptap-table-cell",
        },
      },
    }),
    PapyroTableCellBackground,
    PapyroTableCellContentActions,
  ];
}
