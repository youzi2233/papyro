import { forwardRef, useMemo, useRef, useState } from "react"
import { type Editor } from "@tiptap/react"

// --- Hooks ---
import { useMenuNavigation } from "@/hooks/use-menu-navigation"
import { useIsBreakpoint } from "@/hooks/use-is-breakpoint"
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"

// --- Icons ---
import { BanIcon } from "@/components/tiptap-icons/ban-icon"
import { HighlighterIcon } from "@/components/tiptap-icons/highlighter-icon"

// --- UI Primitives ---
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button"
import { Button } from "@/components/tiptap-ui-primitive/button"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/tiptap-ui-primitive/popover"
import { Separator } from "@/components/tiptap-ui-primitive/separator"
import {
  Card,
  CardBody,
  CardItemGroup,
} from "@/components/tiptap-ui-primitive/card"

// --- Tiptap UI ---
import type {
  HighlightColor,
  UseColorHighlightConfig,
} from "@/components/tiptap-ui/color-highlight-button"
import {
  ColorHighlightButton,
  pickHighlightColorsByValue,
  useColorHighlight,
} from "@/components/tiptap-ui/color-highlight-button"
import { ButtonGroup } from "@/components/tiptap-ui-primitive/button-group"
import {
  colorOptionAriaLabel,
  highlightColorOptionLabel,
  highlightColorsLabel,
  highlightTextLabel,
  removeHighlightLabel,
} from "@/tiptap-i18n"
import { usePapyroTiptapLanguage } from "@/tiptap-react/runtime-context"

export interface ColorHighlightPopoverContentProps {
  /**
   * The Tiptap editor instance.
   */
  editor?: Editor | null
  /**
   * Optional colors to use in the highlight popover.
   * If not provided, defaults to a predefined set of colors.
   */
  colors?: HighlightColor[]
  /**
   * When true, uses the actual color value (colorValue) instead of CSS variable (value).
   * @default false
   */
  useColorValue?: boolean
}

export interface ColorHighlightPopoverProps
  extends
    Omit<ButtonProps, "type">,
    Pick<
      UseColorHighlightConfig,
      "editor" | "hideWhenUnavailable" | "onApplied"
    > {
  /**
   * Optional colors to use in the highlight popover.
   * If not provided, defaults to a predefined set of colors.
   */
  colors?: HighlightColor[]
  /**
   * When true, uses the actual color value (colorValue) instead of CSS variable (value).
   * @default false
   */
  useColorValue?: boolean
}

export const ColorHighlightPopoverButton = forwardRef<
  HTMLButtonElement,
  ButtonProps
>(({ className, children, ...props }, ref) => {
  const language = usePapyroTiptapLanguage()
  const label = highlightTextLabel(language)

  return (
    <Button
      type="button"
      className={className}
      variant="ghost"
      data-appearance="default"
      role="button"
      tabIndex={-1}
      aria-label={label}
      tooltip={label}
      ref={ref}
      {...props}
    >
      {children ?? <HighlighterIcon className="tiptap-button-icon" />}
    </Button>
  )
})

ColorHighlightPopoverButton.displayName = "ColorHighlightPopoverButton"

export function ColorHighlightPopoverContent({
  editor,
  colors = pickHighlightColorsByValue([
    "var(--tt-color-highlight-green)",
    "var(--tt-color-highlight-blue)",
    "var(--tt-color-highlight-red)",
    "var(--tt-color-highlight-purple)",
    "var(--tt-color-highlight-yellow)",
  ]),
  useColorValue = false,
}: ColorHighlightPopoverContentProps) {
  const { handleRemoveHighlight } = useColorHighlight({ editor })
  const language = usePapyroTiptapLanguage()
  const isMobile = useIsBreakpoint()
  const containerRef = useRef<HTMLDivElement>(null)

  const menuItems = useMemo(
    () => [...colors, { label: removeHighlightLabel(language), value: "none" }],
    [colors, language]
  )

  const { selectedIndex } = useMenuNavigation({
    containerRef,
    items: menuItems,
    orientation: "both",
    onSelect: (item) => {
      if (!containerRef.current) return false
      const highlightedElement = containerRef.current.querySelector(
        '[data-highlighted="true"]'
      ) as HTMLElement
      if (highlightedElement) highlightedElement.click()
      if (item.value === "none") handleRemoveHighlight()
      return true
    },
    autoSelectFirstItem: false,
  })

  return (
    <Card
      ref={containerRef}
      tabIndex={0}
      style={isMobile ? { boxShadow: "none", border: 0 } : {}}
    >
      <CardBody style={isMobile ? { padding: 0 } : {}}>
        <CardItemGroup orientation="horizontal">
          <ButtonGroup>
            {colors.map((color, index) => (
              <ButtonGroup key={color.value}>
                <ColorHighlightButton
                  editor={editor}
                  highlightColor={
                    useColorValue ? color.colorValue : color.value
                  }
                  label={highlightColorOptionLabel(language, color.label)}
                  tooltip={highlightColorOptionLabel(language, color.label)}
                  aria-label={colorOptionAriaLabel(language, "highlight", color.label)}
                  tabIndex={index === selectedIndex ? 0 : -1}
                  data-highlighted={selectedIndex === index}
                  useColorValue={useColorValue}
                />
              </ButtonGroup>
            ))}
          </ButtonGroup>
          <Separator />
          <ButtonGroup>
            <Button
              onClick={handleRemoveHighlight}
              aria-label={removeHighlightLabel(language)}
              tooltip={removeHighlightLabel(language)}
              tabIndex={selectedIndex === colors.length ? 0 : -1}
              type="button"
              role="menuitem"
              variant="ghost"
              data-highlighted={selectedIndex === colors.length}
            >
              <BanIcon className="tiptap-button-icon" />
            </Button>
          </ButtonGroup>
        </CardItemGroup>
      </CardBody>
    </Card>
  )
}

export function ColorHighlightPopover({
  editor: providedEditor,
  colors = pickHighlightColorsByValue([
    "var(--tt-color-highlight-green)",
    "var(--tt-color-highlight-blue)",
    "var(--tt-color-highlight-red)",
    "var(--tt-color-highlight-purple)",
    "var(--tt-color-highlight-yellow)",
  ]),
  hideWhenUnavailable = false,
  useColorValue = false,
  onApplied,
  ...props
}: ColorHighlightPopoverProps) {
  const { editor } = useTiptapEditor(providedEditor)
  const language = usePapyroTiptapLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const { isVisible, canColorHighlight, isActive, label, Icon } =
    useColorHighlight({
      editor,
      hideWhenUnavailable,
      onApplied,
    })

  if (!isVisible) return null

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <ColorHighlightPopoverButton
          disabled={!canColorHighlight}
          data-active-state={isActive ? "on" : "off"}
          data-disabled={!canColorHighlight}
          aria-pressed={isActive}
          aria-label={label}
          tooltip={label}
          {...props}
        >
          <Icon className="tiptap-button-icon" />
        </ColorHighlightPopoverButton>
      </PopoverTrigger>
      <PopoverContent aria-label={highlightColorsLabel(language)}>
        <ColorHighlightPopoverContent
          editor={editor}
          colors={colors}
          useColorValue={useColorValue}
        />
      </PopoverContent>
    </Popover>
  )
}

export default ColorHighlightPopover
