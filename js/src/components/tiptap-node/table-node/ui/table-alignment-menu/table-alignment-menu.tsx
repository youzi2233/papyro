import type { Orientation } from "@/components/tiptap-node/table-node/lib/tiptap-table-utils"
import { restoreEditorFocusAfterFloatingMenu } from "@/lib/tiptap-menu-focus"

// --- UI ---
import { useTableAlignCell } from "@/components/tiptap-node/table-node/ui/table-align-cell-button"

// --- Icons ---
import { AlignmentIcon } from "@/components/tiptap-icons/alignment-icon"
import { ChevronRightIcon } from "@/components/tiptap-icons/chevron-right-icon"

// --- UI Primitives ---
import {
  Menu,
  MenuButton,
  MenuButtonArrow,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
} from "@/components/tiptap-ui-primitive/menu"
import { Button } from "@/components/tiptap-ui-primitive/button"
import { ComboboxList } from "@/components/tiptap-ui-primitive/combobox"
import { Separator } from "@/components/tiptap-ui-primitive/separator"
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"
import { usePapyroTiptapLanguage } from "@/tiptap-react/runtime-context"
import {
  tableAlignmentLabel,
  tableTextAlignmentLabel,
  tableVerticalAlignmentLabel,
} from "@/tiptap-i18n"

export interface ActionItemProps {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  label: string
  onClick: () => void
  disabled?: boolean
  isActive?: boolean
  shortcutBadge?: React.ReactNode
}

export const TableAlignMenu = ({
  index,
  orientation,
}: {
  index?: number
  orientation?: Orientation
}) => {
  const { editor } = useTiptapEditor()
  const language = usePapyroTiptapLanguage()
  const textAlign = {
    left: useTableAlignCell({
      alignmentType: "text",
      alignment: "left",
      index,
      orientation,
    }),
    center: useTableAlignCell({
      alignmentType: "text",
      alignment: "center",
      index,
      orientation,
    }),
    right: useTableAlignCell({
      alignmentType: "text",
      alignment: "right",
      index,
      orientation,
    }),
  }

  const verticalAlign = {
    top: useTableAlignCell({
      alignmentType: "vertical",
      alignment: "top",
      index,
      orientation,
    }),
    middle: useTableAlignCell({
      alignmentType: "vertical",
      alignment: "middle",
      index,
      orientation,
    }),
    bottom: useTableAlignCell({
      alignmentType: "vertical",
      alignment: "bottom",
      index,
      orientation,
    }),
  }

  if (!textAlign.left.canAlignCell()) {
    return null
  }

  return (
    <Menu
      placement="right"
      trigger={
        <MenuButton
          render={
            <MenuItem
              render={
                <Button variant="ghost">
                  <AlignmentIcon className="tiptap-button-icon" />
                  <span className="tiptap-button-text">
                    {tableAlignmentLabel(language)}
                  </span>
                  <MenuButtonArrow render={<ChevronRightIcon />} />
                </Button>
              }
            />
          }
        />
      }
    >
      <MenuContent
        className="tiptap-table-menu-content tiptap-table-submenu-content"
        portal
        onMouseDown={(event) => {
          if (event.button === 0) event.preventDefault()
        }}
        onPointerDown={(event) => {
          if (event.button === 0) event.preventDefault()
        }}
      >
        <ComboboxList>
          <MenuGroup>
            <MenuGroupLabel>{tableTextAlignmentLabel(language)}</MenuGroupLabel>
            {Object.values(textAlign).map((align, i) => (
              <ActionItem
                key={`text-${i}`}
                icon={align.Icon}
                label={align.label}
                disabled={!align.canAlignCell()}
                isActive={align.isActive}
                onClick={() => {
                  align.handleAlign()
                  restoreEditorFocusAfterFloatingMenu(editor)
                }}
              />
            ))}
            <Separator orientation="horizontal" />
            <MenuGroupLabel>{tableVerticalAlignmentLabel(language)}</MenuGroupLabel>
            {Object.values(verticalAlign).map((align, i) => (
              <ActionItem
                key={`vertical-${i}`}
                icon={align.Icon}
                label={align.label}
                disabled={!align.canAlignCell()}
                isActive={align.isActive}
                onClick={() => {
                  align.handleAlign()
                  restoreEditorFocusAfterFloatingMenu(editor)
                }}
              />
            ))}
          </MenuGroup>
        </ComboboxList>
      </MenuContent>
    </Menu>
  )
}

const ActionItem = ({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  isActive = false,
  shortcutBadge,
}: ActionItemProps) => (
  <MenuItem
    render={
      <Button variant="ghost" data-active-state={isActive ? "on" : "off"} />
    }
    onClick={onClick}
    disabled={disabled}
  >
    <Icon className="tiptap-button-icon" />
    <span className="tiptap-button-text">{label}</span>
    {shortcutBadge}
  </MenuItem>
)

ActionItem.displayName = "ActionItem"
