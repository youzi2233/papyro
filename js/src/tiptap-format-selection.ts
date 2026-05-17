import type { EditorState } from "@tiptap/pm/state"
import { NodeSelection, TextSelection } from "@tiptap/pm/state"
import { CellSelection } from "@tiptap/pm/tables"
import type { EditorView } from "@tiptap/pm/view"

export type FormattingSelectionEditor = {
  state: EditorState
  view: Pick<EditorView, "dispatch" | "focus">
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max))
}

/**
 * Collapse a formatting selection after a command has applied visual styling.
 *
 * Color actions often expand an empty cursor to the current block so headings
 * and paragraphs can be styled as a whole. Keeping that range selected hides
 * the applied color behind the platform selection paint, so collapse text/node
 * selections after the command succeeds. Table cell selections are left intact
 * because they carry multi-cell operation intent.
 */
export function collapseFormattingSelection(
  editor: FormattingSelectionEditor
): boolean {
  const { state, view } = editor
  const { selection, doc } = state

  if (selection.empty || selection instanceof CellSelection) return false

  let targetPos = selection.to

  if (selection instanceof NodeSelection) {
    const nodeType = selection.node?.type?.name
    if (nodeType === "table" || nodeType === "image") return false
    targetPos = Math.max(selection.from + 1, selection.to - 1)
  }

  targetPos = clamp(targetPos, 0, doc.content.size)

  try {
    const nextSelection = TextSelection.near(doc.resolve(targetPos), -1)
    if (selection.eq(nextSelection)) return false

    view.dispatch(state.tr.setSelection(nextSelection).scrollIntoView())
    try {
      view.focus()
    } catch {
      // Headless tests and detached WebView hosts can still keep the transaction.
    }
    return true
  } catch {
    return false
  }
}
