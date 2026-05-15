import type { Editor } from "@tiptap/react"

// Primitive UI Components
import { Button } from "@/components/tiptap-ui-primitive/button"
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuGroup,
  MenuGroupLabel,
  MenuButton,
  MenuButtonArrow,
} from "@/components/tiptap-ui-primitive/menu"
import { ComboboxList } from "@/components/tiptap-ui-primitive/combobox"
import { Separator } from "@/components/tiptap-ui-primitive/separator"

// Tiptap UI
import {
  colorMenuLabel,
  colorOptionLabel,
  highlightColorsLabel,
  recentColorsLabel,
  textColorLabel,
} from "@/tiptap-i18n"
import {
  TEXT_COLORS,
  useColorText,
} from "@/components/tiptap-ui/color-text-button"
import {
  HIGHLIGHT_COLORS,
  useColorHighlight,
} from "@/components/tiptap-ui/color-highlight-button"
import type { RecentColor } from "@/components/tiptap-ui/color-text-popover"
import {
  type ColorItem,
  getColorByValue,
  useRecentColors,
} from "@/components/tiptap-ui/color-text-popover"

// Icons
import { PaintBucketIcon } from "@/components/tiptap-icons/paint-bucket-icon"
import { ChevronRightIcon } from "@/components/tiptap-icons/chevron-right-icon"
import { TextColorSmallIcon } from "@/components/tiptap-icons/text-color-small-icon"
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"
import { usePapyroTiptapLanguage } from "@/tiptap-react/runtime-context"

interface ColorMenuItemProps {
  color: ColorItem
  language: string
}

function colorMenuSwatchStyle(color: ColorItem): React.CSSProperties {
  return {
    "--color-swatch-color": color.colorValue ?? color.value,
    "--color-swatch-border": color.border ?? "var(--mn-border, #d1d5db)",
  } as React.CSSProperties
}

type ColorMenuCanCommands = {
  setMark?: (name: string, attrs?: Record<string, unknown>) => boolean
  toggleNodeBackgroundColor?: (backgroundColor: string) => boolean
}

function canSetMark(
  commands: ColorMenuCanCommands | null,
  name: "textStyle" | "highlight"
): boolean {
  try {
    return typeof commands?.setMark === "function" && commands.setMark(name)
  } catch {
    return false
  }
}

function canToggleNodeBackgroundColor(
  commands: ColorMenuCanCommands | null,
  backgroundColor: string
): boolean {
  try {
    return (
      typeof commands?.toggleNodeBackgroundColor === "function" &&
      commands.toggleNodeBackgroundColor(backgroundColor)
    )
  } catch {
    return false
  }
}

export function canUseColorMenu(editor: Editor | null): boolean {
  if (!editor) return false

  let commands: ColorMenuCanCommands | null = null
  try {
    commands = editor.can() as ColorMenuCanCommands
  } catch {
    return false
  }

  return (
    canSetMark(commands, "textStyle") ||
    canSetMark(commands, "highlight") ||
    canToggleNodeBackgroundColor(commands, "yellow")
  )
}

const TextColorMenuItem: React.FC<ColorMenuItemProps> = ({
  color,
  language,
}) => {
  const { addRecentColor } = useRecentColors()
  const localizedLabel = colorOptionLabel(language, "text", color.label)
  const { isActive, handleColorText, label } = useColorText({
    label: localizedLabel,
    textColor: color.value,
    onApplied: ({ color, label }) =>
      addRecentColor({ type: "text", label, value: color }),
  })

  return (
    <MenuItem
      render={
        <Button variant="ghost" data-active-state={isActive ? "on" : "off"} />
      }
      onClick={handleColorText}
    >
      <span
        className="tiptap-button-color-text"
        style={{
          ...colorMenuSwatchStyle(color),
          color: color.value,
        }}
      >
        <TextColorSmallIcon
          className="tiptap-button-icon"
          style={{ color: color.value, flexGrow: 1 }}
        />
      </span>
      <span className="tiptap-button-text">{label}</span>
    </MenuItem>
  )
}

const HighlightColorMenuItem: React.FC<ColorMenuItemProps> = ({
  color,
  language,
}) => {
  const { addRecentColor } = useRecentColors()
  const localizedLabel = colorOptionLabel(language, "highlight", color.label)
  const { isActive, handleColorHighlight, label } = useColorHighlight({
    label: localizedLabel,
    highlightColor: color.value,
    mode: "node",
    onApplied: ({ color, label }) =>
      addRecentColor({ type: "highlight", label, value: color }),
  })

  return (
    <MenuItem
      render={
        <Button variant="ghost" data-active-state={isActive ? "on" : "off"} />
      }
      onClick={handleColorHighlight}
    >
      <span
        className="tiptap-button-highlight"
        style={
          {
            ...colorMenuSwatchStyle(color),
            "--highlight-color": color.value,
          } as React.CSSProperties
        }
      />
      <span className="tiptap-button-text">{label}</span>
    </MenuItem>
  )
}

const RecentColorMenuItem: React.FC<{
  colorObj: RecentColor
  language: string
}> = ({ colorObj, language }) => {
  const colorSet = colorObj.type === "text" ? TEXT_COLORS : HIGHLIGHT_COLORS
  const color = getColorByValue(colorObj.value, colorSet)

  const ColorComponent =
    colorObj.type === "text" ? TextColorMenuItem : HighlightColorMenuItem

  return <ColorComponent color={color} language={language} />
}

export interface ColorMenuProps {
  editor?: Editor | null
  /**
   * Custom trigger component. If not provided, uses default paint bucket button.
   */
  trigger?: React.ReactNode
  /**
   * Label for the color menu trigger
   * @default "Color"
   */
  label?: string
  /**
   * Menu placement relative to trigger
   * @default "right"
   */
  placement?: React.ComponentProps<typeof Menu>["placement"]
}

/**
 * Reusable color menu component that provides text and highlight color options.
 * Includes recent colors, text colors, and highlight colors sections.
 */
export const ColorMenu: React.FC<ColorMenuProps> = ({
  editor: providedEditor,
  trigger,
  label,
  placement = "right",
}) => {
  const { editor } = useTiptapEditor(providedEditor)
  const language = usePapyroTiptapLanguage()
  const { recentColors, isInitialized } = useRecentColors()
  const menuLabel = label ?? colorMenuLabel(language)

  const hasColorActions = canUseColorMenu(editor)

  if (!editor || !hasColorActions) {
    return null
  }

  const defaultTrigger = (
    <MenuItem
      render={
        <MenuButton
          render={
            <Button variant="ghost">
              <PaintBucketIcon className="tiptap-button-icon" />
              <span className="tiptap-button-text">{menuLabel}</span>
              <MenuButtonArrow render={<ChevronRightIcon />} />
            </Button>
          }
        />
      }
    />
  )

  return (
    <Menu placement={placement} trigger={trigger || defaultTrigger}>
      <MenuContent
        portal
        onMouseDown={(event) => {
          if (event.button === 0) event.preventDefault()
        }}
        onPointerDown={(event) => {
          if (event.button === 0) event.preventDefault()
        }}
      >
        <ComboboxList>
          {/* Recent Colors */}
          {isInitialized && recentColors.length > 0 && (
            <MenuGroup>
              <MenuGroupLabel>{recentColorsLabel(language)}</MenuGroupLabel>
              {recentColors.map((colorObj) => (
                <RecentColorMenuItem
                  key={`${colorObj.type}-${colorObj.value}`}
                  colorObj={colorObj}
                  language={language}
                />
              ))}
              <Separator orientation="horizontal" />
            </MenuGroup>
          )}

          {/* Text Colors */}
          <MenuGroup>
            <MenuGroupLabel>{textColorLabel(language)}</MenuGroupLabel>
            {TEXT_COLORS.map((textColor) => (
              <TextColorMenuItem
                key={textColor.value}
                color={textColor}
                language={language}
              />
            ))}
          </MenuGroup>

          <Separator orientation="horizontal" />

          {/* Background Colors */}
          <MenuGroup>
            <MenuGroupLabel>{highlightColorsLabel(language)}</MenuGroupLabel>
            {HIGHLIGHT_COLORS.map((highlightColor) => (
              <HighlightColorMenuItem
                key={highlightColor.value}
                color={highlightColor}
                language={language}
              />
            ))}
          </MenuGroup>
        </ComboboxList>
      </MenuContent>
    </Menu>
  )
}

export { TextColorMenuItem, HighlightColorMenuItem, RecentColorMenuItem }
