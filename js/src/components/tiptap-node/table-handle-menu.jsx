"use client";
import {
  useCallback,
  useMemo,
  useState,
  createContext,
  useContext,
} from "react"
import { TableMap } from "@tiptap/pm/tables"

// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"
import { cn, isValidPosition } from "@/lib/tiptap-utils"
import { selectCellsByCoords } from "@/components/tiptap-node/table-node/lib/tiptap-table-utils"

// --- Icons ---
import { MoreVerticalIcon } from "@/components/tiptap-icons/more-vertical-icon"

// --- UI Primitives ---
import {
  Menu,
  MenuButton,
} from "@/components/tiptap-ui-primitive/menu"

// --- Tiptap UI ---
import { PapyroTableCommandMenuContent } from "@/components/tiptap-node/table-command-menu.jsx"
import { createPapyroTableCommandMenuModel } from "@/components/tiptap-node/table-cell-handle-menu-model.js"

import { dragEnd } from "@/components/tiptap-node/table-node/extensions/table-handle"

import "./table-handle-menu.scss"

const MENU_PLACEMENT_MAP = {
  row: "top-start",
  column: "bottom-start",
}

const ARIA_LABELS = {
  row: "Row actions",
  column: "Column actions",
}

/* -------------------------------------------------------------------------------------------------
 * Context
 * ----------------------------------------------------------------------------------------------- */

const TableHandleContext = createContext(null)

function useTableHandleContext() {
  const context = useContext(TableHandleContext)
  if (!context) {
    throw new Error("useTableHandleContext must be used within TableHandleProvider")
  }
  return context
}

/* -------------------------------------------------------------------------------------------------
 * Hooks
 * ----------------------------------------------------------------------------------------------- */

/**
 * Hook to manage table handle menu state and interactions
 */
function useTableHandleMenu(
  onToggleOtherHandle,
  onOpenChange
) {
  const { editor, orientation, index, tableNode, tablePos } =
    useTableHandleContext()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const menuPlacement = useMemo(() => MENU_PLACEMENT_MAP[orientation], [orientation])

  const selectRowOrColumn = useCallback(() => {
    if (
      !editor ||
      !tableNode ||
      !isValidPosition(tablePos) ||
      !isValidPosition(index)
    )
      return

    try {
      const { width, height } = TableMap.get(tableNode)
      const start =
        orientation === "row" ? { row: index, col: 0 } : { row: 0, col: index }
      const end =
        orientation === "row"
          ? { row: index, col: width - 1 }
          : { row: height - 1, col: index }

      selectCellsByCoords(editor, tablePos, [start, end], {
        mode: "dispatch",
        dispatch: editor.view.dispatch.bind(editor.view),
      })
    } catch (error) {
      console.warn("Failed to select row/column:", error)
    }
  }, [editor, tableNode, tablePos, orientation, index])

  const handleMenuToggle = useCallback((isOpen) => {
    if (!editor) return

    setIsMenuOpen(isOpen)
    onOpenChange?.(isOpen)

    if (isOpen) {
      editor.commands.freezeHandles()
      selectRowOrColumn()
      onToggleOtherHandle?.(false)
    } else {
      editor.commands.unfreezeHandles()
      onToggleOtherHandle?.(true)
    }
  }, [editor, onOpenChange, onToggleOtherHandle, selectRowOrColumn])

  const resetMenu = useCallback(() => {
    if (!editor) return

    setIsMenuOpen(false)
    onOpenChange?.(false)
    editor.commands.unfreezeHandles()
    onToggleOtherHandle?.(true)
  }, [editor, onOpenChange, onToggleOtherHandle])

  return {
    isMenuOpen,
    isDragging,
    setIsDragging,
    menuPlacement,
    handleMenuToggle,
    resetMenu,
  }
}

/**
 * Menu content component
 */
const TableActionMenu = ({
  onClose,
}) => {
  const { editor, orientation, language } = useTableHandleContext()
  const model = useMemo(
    () =>
      createPapyroTableCommandMenuModel({
        editor,
        language,
        selectionKind: orientation,
      }),
    [editor, language, orientation],
  )

  return (
    <PapyroTableCommandMenuContent
      editor={editor}
      language={language}
      model={model}
      onClose={onClose}
      contentProps={{ autoFocusOnHide: false }} />
  );
}

/**
 * Main table handle menu component
 */
export const TableHandleMenu = ({
  editor: providedEditor,
  orientation,
  index,
  language = "english",
  tableNode,
  tablePos,
  onToggleOtherHandle,
  onOpenChange,
  dragStart
}) => {
  const { editor } = useTiptapEditor(providedEditor)

  const contextValue = useMemo(() => ({
    editor,
    orientation,
    index,
    language,
    tableNode,
    tablePos,
  }), [editor, orientation, index, language, tableNode, tablePos])

  return (
    <TableHandleContext.Provider value={contextValue}>
      <TableHandleMenuContent
        onToggleOtherHandle={onToggleOtherHandle}
        onOpenChange={onOpenChange}
        dragStart={dragStart} />
    </TableHandleContext.Provider>
  );
}

/**
 * Internal menu content component
 */
const TableHandleMenuContent = ({
  onToggleOtherHandle,
  onOpenChange,
  dragStart
}) => {
  const { orientation } = useTableHandleContext()
  const {
    isMenuOpen,
    isDragging,
    setIsDragging,
    menuPlacement,
    handleMenuToggle,
    resetMenu,
  } = useTableHandleMenu(onToggleOtherHandle, onOpenChange)

  const ariaLabel = ARIA_LABELS[orientation]

  const handleDragStart = useCallback((e) => {
    setIsDragging(true)
    dragStart?.(e)
  }, [dragStart, setIsDragging])

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
    dragEnd()
  }, [setIsDragging])

  return (
    <Menu
      open={isMenuOpen}
      onOpenChange={handleMenuToggle}
      placement={menuPlacement}
      trigger={
        <MenuButton
          className={cn(
            "tiptap-table-handle-menu",
            isMenuOpen && "menu-opened",
            isDragging && "is-dragging",
            orientation
          )}
          draggable={true}
          aria-label={ariaLabel}
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}>
          <MoreVerticalIcon className="tiptap-button-icon" />
        </MenuButton>
      }>
      <TableActionMenu onClose={resetMenu} />
    </Menu>
  );
}

export { TableActionMenu }
