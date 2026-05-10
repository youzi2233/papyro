import { useCallback } from "react"

import {
  runTableEditorCommand,
  TABLE_STYLE_LAYOUT_GROUPS,
  tableCommandVariant,
} from "@/tiptap-table-commands.js"
import { tableCommandLayoutGroupLabel } from "@/tiptap-i18n.js"

// --- UI Primitives ---
import { Button } from "@/components/tiptap-ui-primitive/button"
import { Combobox, ComboboxList } from "@/components/tiptap-ui-primitive/combobox"
import {
  Menu,
  MenuButton,
  MenuButtonArrow,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
} from "@/components/tiptap-ui-primitive/menu"
import { Separator } from "@/components/tiptap-ui-primitive/separator"

// --- Icons ---
import { ChevronRightIcon } from "@/components/tiptap-icons/chevron-right-icon"
import { TableCommandIcon } from "@/tiptap-react/components/table-command-icons.jsx"

// --- Lib ---
import { SR_ONLY } from "@/lib/tiptap-utils"

const TABLE_STYLE_LAYOUT_GROUP_SET = new Set(TABLE_STYLE_LAYOUT_GROUPS)

const TableCommandItem = ({
  command,
  editor,
  onExecute,
}) => {
  const variant = command.variant ?? tableCommandVariant(command)
  const handleClick = useCallback(() => {
    if (command.disabled) return
    const ok = runTableEditorCommand(editor, command.command, command.args ?? [])
    if (ok) onExecute?.()
  }, [command, editor, onExecute])

  return (
    <MenuItem
      render={
        <Button
          variant="ghost"
          data-active-state={command.active ? "on" : "off"}
          data-papyro-table-command={command.id}
          data-variant={variant}
          data-tone={command.tone ?? "default"} />
      }
      aria-label={command.description ? `${command.title}. ${command.description}` : command.title}
      disabled={command.disabled}
      onClick={handleClick}>
      <span
        className="tiptap-button-icon papyro-table-cell-command-icon"
        data-command-icon={command.icon ?? command.id}
        data-command-variant={variant}>
        <TableCommandIcon icon={command.icon ?? command.id} />
      </span>
      <span className="tiptap-button-text">{command.label}</span>
    </MenuItem>
  )
}

const TableStyleSubmenu = ({
  group,
  editor,
  language,
  onExecute,
}) => {
  const label = tableCommandLayoutGroupLabel(language, group.layoutGroup)
  const firstCommand = group.commands.find((command) => !command.disabled) ?? group.commands[0]

  if (!firstCommand) return null

  return (
    <Menu
      placement="right-start"
      trigger={
        <MenuButton
          render={
            <MenuItem
              render={
                <Button
                  variant="ghost"
                  data-papyro-table-command-group={group.layoutGroup}>
                  <span
                    className="tiptap-button-icon papyro-table-cell-command-icon"
                    data-command-icon={firstCommand.icon ?? firstCommand.id}
                    data-command-variant={firstCommand.variant ?? tableCommandVariant(firstCommand)}>
                    <TableCommandIcon icon={firstCommand.icon ?? firstCommand.id} />
                  </span>
                  <span className="tiptap-button-text">{label}</span>
                  <MenuButtonArrow render={<ChevronRightIcon />} />
                </Button>
              } />
          } />
      }>
      <MenuContent>
        <ComboboxList>
          <MenuGroup>
            {group.commands.map((command) => (
              <TableCommandItem
                key={command.id}
                command={command}
                editor={editor}
                onExecute={onExecute} />
            ))}
          </MenuGroup>
        </ComboboxList>
      </MenuContent>
    </Menu>
  )
}

const TableCommandGroup = ({
  group,
  editor,
  language,
  onExecute,
}) => {
  if (
    group.menuSection === "style" &&
    TABLE_STYLE_LAYOUT_GROUP_SET.has(group.layoutGroup)
  ) {
    return (
      <TableStyleSubmenu
        group={group}
        editor={editor}
        language={language}
        onExecute={onExecute} />
    )
  }

  return (
    <MenuGroup>
      {group.showLabel && <MenuGroupLabel>{group.group}</MenuGroupLabel>}
      {group.commands.map((command) => (
        <TableCommandItem
          key={command.id}
          command={command}
          editor={editor}
          onExecute={onExecute} />
      ))}
    </MenuGroup>
  )
}

export function PapyroTableCommandMenuContent({
  editor,
  language = "english",
  model,
  onClose,
  contentProps = {},
  minWidth = "15rem",
}) {
  return (
    <MenuContent autoFocusOnShow modal onClose={onClose} {...contentProps}>
      <Combobox style={SR_ONLY} />
      <ComboboxList style={{ minWidth }}>
        {(model?.groups ?? []).map((group, index) => (
          <div key={group.groupKey} data-papyro-table-menu-group={group.groupKey}>
            {index > 0 && <Separator orientation="horizontal" />}
            <TableCommandGroup
              group={group}
              editor={editor}
              language={language}
              onExecute={onClose} />
          </div>
        ))}
      </ComboboxList>
    </MenuContent>
  )
}
