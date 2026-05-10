import React, { useCallback, useState } from "react";

import { TableCellHandleMenu } from "../components/tiptap-node/table-cell-handle-menu.jsx";
import { TableExtendRowColumnButtons } from "../components/tiptap-node/table-extend-row-column-button.jsx";
import { TableHandle } from "../components/tiptap-node/table-handle.jsx";
import { TableSelectionOverlay } from "../components/tiptap-node/table-selection-overlay.jsx";
import "../components/tiptap-node/prosemirror-table.scss";
import "../components/tiptap-node/table-cell-handle-menu.scss";
import "../components/tiptap-node/table-extend-row-column-button.scss";
import "../components/tiptap-node/table-handle-menu.scss";
import "../components/tiptap-node/table-node.scss";
import "../styles/_variables.scss";
import "../styles/_keyframe-animations.scss";

export function PapyroOfficialTableNodeLayer({ editor, entry = null }) {
  const [cellMenuOpen, setCellMenuOpen] = useState(false);
  const language = entry?.preferences?.language ?? entry?.dom?.dataset?.language ?? "english";

  const renderCellMenu = useCallback((props) => (
    <TableCellHandleMenu
      editor={props.editor}
      language={language}
      selectionKind={props.selectionKind}
      onOpenChange={props.onOpenChange}
      onMouseDown={(event) => props.onResizeStart?.("br")?.(event)}
    />
  ), [language]);

  if (!editor) return null;

  return (
    <>
      <TableHandle editor={editor} language={language} />
      <TableSelectionOverlay
        editor={editor}
        showResizeHandles={!cellMenuOpen}
        onMenuOpenChange={setCellMenuOpen}
        cellMenu={renderCellMenu}
      />
      <TableExtendRowColumnButtons editor={editor} />
    </>
  );
}
