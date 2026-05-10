import { forwardRef, useCallback, useEffect, useMemo, useState } from "react"

// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"

// --- Lib ---
import { cn } from "@/lib/tiptap-utils"

// --- Commands ---
import {
  createTableCellHandleCommandMenuModel,
  normalizeTableCellMenuSelectionKind,
} from "@/components/tiptap-node/table-cell-handle-menu-model.js"
import { PapyroTableCommandMenuContent } from "@/components/tiptap-node/table-command-menu.jsx"

// --- UI Primitives ---
import {
  Menu,
  MenuButton,
} from "@/components/tiptap-ui-primitive/menu"

// --- Icons ---
import { Grip4Icon } from "@/components/tiptap-icons/grip-4-icon"

import "./table-cell-handle-menu.scss"

/**
 * Hook to manage table handle menu state and interactions
 */
function useTableCellHandleMenu({
  editor
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false)
    editor?.commands.unfreezeHandles()
  }, [editor])

  const handleMenuToggle = useCallback((isOpen) => {
    setIsMenuOpen(isOpen)

    if (!editor) return

    if (isOpen) {
      editor.commands.freezeHandles()
    } else {
      editor.commands.unfreezeHandles()
    }
  }, [editor])

  return {
    isMenuOpen,
    handleMenuToggle,
    closeMenu,
  }
}

const TableActionMenu = ({
  editor,
  language = "english",
  selectionKind = "cell",
  onClose,
}) => {
  const normalizedSelectionKind = normalizeTableCellMenuSelectionKind(selectionKind)
  const model = useMemo(
    () =>
      createTableCellHandleCommandMenuModel({
        editor,
        language,
        selectionKind: normalizedSelectionKind,
      }),
    [editor, language, normalizedSelectionKind],
  )

  return (
    <PapyroTableCommandMenuContent
      editor={editor}
      language={language}
      model={model}
      onClose={onClose} />
  )
}

export const TableCellHandleMenu = forwardRef(({ editor: providedEditor, language = "english", selectionKind = "cell", onOpenChange, className, ...props }, ref) => {
  const { editor } = useTiptapEditor(providedEditor)
  const { isMenuOpen, handleMenuToggle, closeMenu } = useTableCellHandleMenu({
    editor,
  })

  useEffect(() => {
    onOpenChange?.(isMenuOpen)
  }, [isMenuOpen, onOpenChange])

  return (
    <Menu
      open={isMenuOpen}
      onOpenChange={handleMenuToggle}
      placement="bottom-start"
      trigger={
        <MenuButton
          ref={ref}
          className={cn("expandable-menu-button", isMenuOpen && "menu-opened", className)}
          aria-label="Table cells option"
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          {...props}>
          <Grip4Icon className="tiptap-button-icon" />
        </MenuButton>
      }>
      <TableActionMenu
        editor={editor}
        language={language}
        selectionKind={selectionKind}
        onClose={closeMenu} />
    </Menu>
  );
})

TableCellHandleMenu.displayName = "TableCellHandleMenu"

export { TableActionMenu }
