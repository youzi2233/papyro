export type TableCommandId =
  | "add-column-before"
  | "add-column-after"
  | "delete-column"
  | "add-row-before"
  | "add-row-after"
  | "delete-row"
  | "merge-cells"
  | "split-cell"
  | "copy-cell-content"
  | "clear-cell-content"
  | "clear-cell-style"
  | "merge-or-split"
  | "toggle-header-row"
  | "toggle-header-column"
  | "toggle-header-cell"
  | "align-left"
  | "align-center"
  | "align-right"
  | "cell-text-clear"
  | "cell-text-muted"
  | "cell-text-accent"
  | "cell-text-danger"
  | "cell-bg-clear"
  | "cell-bg-yellow"
  | "cell-bg-blue"
  | "cell-bg-green"
  | "previous-cell"
  | "next-cell"
  | "fix-table"
  | "delete-table";

export type TableCommandGroup =
  | "Columns"
  | "Rows"
  | "Cells"
  | "Headers"
  | "Align"
  | "Text color"
  | "Cell color"
  | "Navigate"
  | "Table";

export type TableCommandVariant = "text" | "icon" | "text-swatch" | "swatch";
export type TableCommandLayoutGroup =
  | "actions"
  | "align"
  | "text-color"
  | "cell-color"
  | "danger";
export type TableCommandMenuSection = "structure" | "content" | "style" | "danger";
export type TableCommandMenuMode = "context" | "keyboard";
export type TableCommandSelectionKind = "cell" | "cells" | "row" | "column" | "table";

export interface TableCommand {
  id: TableCommandId;
  group: TableCommandGroup;
  title: string;
  label: string;
  command: string;
  icon: string;
  args?: readonly unknown[];
  disabled?: boolean;
  tone?: "danger";
  variant?: TableCommandVariant;
  groupKey?: TableCommandGroup;
  layoutGroup?: TableCommandLayoutGroup;
  menuSection?: TableCommandMenuSection;
}

export interface IndexedTableCommand extends TableCommand {
  index: number;
}

export interface TableCommandMenuGroup {
  groupKey: string;
  group: string;
  layoutGroup: TableCommandLayoutGroup;
  menuSection: TableCommandMenuSection;
  showLabel: boolean;
  commands: IndexedTableCommand[];
}

export interface TableCommandMenuState {
  mode: TableCommandMenuMode;
  selectionKind: TableCommandSelectionKind;
  commands: TableCommand[];
  enabledCommandIds: TableCommandId[];
  activeCommandId: TableCommandId | null;
}

export interface TableCommandMenuModel extends TableCommandMenuState {
  groups: Array<TableCommandMenuGroup & {
    order: number;
    layoutGroups: TableCommandLayoutGroup[];
  }>;
}

type TableEditorCommand = (...args: readonly unknown[]) => unknown;

export interface TableCommandEditor {
  commands?: Record<string, TableEditorCommand | undefined> & {
    focus?: () => unknown;
  };
  can?: () => Record<string, TableEditorCommand | undefined> | null;
}

export const TABLE_CELL_MENU_COMMAND_IDS = new Set<TableCommandId>([
  "split-cell",
  "copy-cell-content",
  "clear-cell-content",
  "clear-cell-style",
  "align-left",
  "align-center",
  "align-right",
  "cell-text-clear",
  "cell-text-muted",
  "cell-text-accent",
  "cell-text-danger",
  "cell-bg-clear",
  "cell-bg-yellow",
  "cell-bg-blue",
  "cell-bg-green",
]);

export const TABLE_STYLE_LAYOUT_GROUPS = Object.freeze([
  "align",
  "text-color",
  "cell-color",
]) satisfies readonly TableCommandLayoutGroup[];

const TABLE_AXIS_STYLE_COMMAND_IDS = Object.freeze([
  "align-left",
  "align-center",
  "align-right",
  "cell-text-clear",
  "cell-text-muted",
  "cell-text-accent",
  "cell-text-danger",
  "cell-bg-clear",
  "cell-bg-yellow",
  "cell-bg-blue",
  "cell-bg-green",
]) satisfies readonly TableCommandId[];

export const TABLE_COMMANDS = Object.freeze([
  {
    id: "add-column-before",
    group: "Columns",
    title: "Insert column left",
    label: "Left",
    command: "addColumnBefore",
    icon: "column-left",
  },
  {
    id: "add-column-after",
    group: "Columns",
    title: "Insert column right",
    label: "Right",
    command: "addColumnAfter",
    icon: "column-right",
  },
  {
    id: "delete-column",
    group: "Columns",
    title: "Delete current column",
    label: "Delete",
    command: "deleteColumn",
    icon: "delete-column",
    tone: "danger",
  },
  {
    id: "add-row-before",
    group: "Rows",
    title: "Insert row above",
    label: "Above",
    command: "addRowBefore",
    icon: "row-above",
  },
  {
    id: "add-row-after",
    group: "Rows",
    title: "Insert row below",
    label: "Below",
    command: "addRowAfter",
    icon: "row-below",
  },
  {
    id: "delete-row",
    group: "Rows",
    title: "Delete current row",
    label: "Delete",
    command: "deleteRow",
    icon: "delete-row",
    tone: "danger",
  },
  {
    id: "merge-cells",
    group: "Cells",
    title: "Merge selected cells",
    label: "Merge",
    command: "mergeCells",
    icon: "merge",
  },
  {
    id: "split-cell",
    group: "Cells",
    title: "Split merged cell",
    label: "Split",
    command: "splitCell",
    icon: "split",
  },
  {
    id: "copy-cell-content",
    group: "Cells",
    title: "Copy cell content",
    label: "Copy",
    command: "copySelectedTableCells",
    icon: "copy-cell",
  },
  {
    id: "clear-cell-content",
    group: "Cells",
    title: "Clear cell content",
    label: "Clear content",
    command: "clearSelectedTableCells",
    icon: "clear-content",
  },
  {
    id: "clear-cell-style",
    group: "Cells",
    title: "Clear cell style",
    label: "Clear style",
    command: "resetSelectedTableCellAttrs",
    icon: "clear-style",
  },
  {
    id: "merge-or-split",
    group: "Cells",
    title: "Merge or split cells",
    label: "Auto",
    command: "mergeOrSplit",
    icon: "merge",
  },
  {
    id: "toggle-header-row",
    group: "Headers",
    title: "Toggle header row",
    label: "Row",
    command: "toggleHeaderRow",
    icon: "header-row",
  },
  {
    id: "toggle-header-column",
    group: "Headers",
    title: "Toggle header column",
    label: "Column",
    command: "toggleHeaderColumn",
    icon: "header-column",
  },
  {
    id: "toggle-header-cell",
    group: "Headers",
    title: "Toggle header cell",
    label: "Cell",
    command: "toggleHeaderCell",
    icon: "header-cell",
  },
  {
    id: "align-left",
    group: "Align",
    title: "Align current cells left",
    label: "Left",
    command: "setCellAttribute",
    args: ["align", null],
    icon: "align-left",
    variant: "icon",
  },
  {
    id: "align-center",
    group: "Align",
    title: "Align current cells center",
    label: "Center",
    command: "setCellAttribute",
    args: ["align", "center"],
    icon: "align-center",
    variant: "icon",
  },
  {
    id: "align-right",
    group: "Align",
    title: "Align current cells right",
    label: "Right",
    command: "setCellAttribute",
    args: ["align", "right"],
    icon: "align-right",
    variant: "icon",
  },
  {
    id: "cell-text-clear",
    group: "Text color",
    title: "Clear cell text color",
    label: "Default",
    command: "setSelectedTableCellTextColor",
    args: [null],
    icon: "text-color-clear",
    variant: "text-swatch",
  },
  {
    id: "cell-text-muted",
    group: "Text color",
    title: "Use muted cell text",
    label: "Muted",
    command: "setSelectedTableCellTextColor",
    args: ["var(--mn-ink-3)"],
    icon: "text-color-muted",
    variant: "text-swatch",
  },
  {
    id: "cell-text-accent",
    group: "Text color",
    title: "Use accent cell text",
    label: "Accent",
    command: "setSelectedTableCellTextColor",
    args: ["var(--mn-accent)"],
    icon: "text-color-accent",
    variant: "text-swatch",
  },
  {
    id: "cell-text-danger",
    group: "Text color",
    title: "Use danger cell text",
    label: "Danger",
    command: "setSelectedTableCellTextColor",
    args: ["var(--mn-danger)"],
    icon: "text-color-danger",
    variant: "text-swatch",
  },
  {
    id: "cell-bg-clear",
    group: "Cell color",
    title: "Clear cell background",
    label: "Clear",
    command: "setCellAttribute",
    args: ["backgroundColor", null],
    icon: "color-clear",
    variant: "swatch",
  },
  {
    id: "cell-bg-yellow",
    group: "Cell color",
    title: "Use a soft yellow cell background",
    label: "Yellow",
    command: "setCellAttribute",
    args: ["backgroundColor", "rgba(245, 158, 11, 0.16)"],
    icon: "color-yellow",
    variant: "swatch",
  },
  {
    id: "cell-bg-blue",
    group: "Cell color",
    title: "Use a soft blue cell background",
    label: "Blue",
    command: "setCellAttribute",
    args: ["backgroundColor", "rgba(59, 130, 246, 0.14)"],
    icon: "color-blue",
    variant: "swatch",
  },
  {
    id: "cell-bg-green",
    group: "Cell color",
    title: "Use a soft green cell background",
    label: "Green",
    command: "setCellAttribute",
    args: ["backgroundColor", "rgba(16, 185, 129, 0.14)"],
    icon: "color-green",
    variant: "swatch",
  },
  {
    id: "previous-cell",
    group: "Navigate",
    title: "Move to previous cell",
    label: "Prev",
    command: "goToPreviousCell",
    icon: "previous",
  },
  {
    id: "next-cell",
    group: "Navigate",
    title: "Move to next cell",
    label: "Next",
    command: "goToNextCell",
    icon: "next",
  },
  {
    id: "fix-table",
    group: "Table",
    title: "Repair table structure",
    label: "Repair",
    command: "fixTables",
    icon: "repair",
  },
  {
    id: "delete-table",
    group: "Table",
    title: "Delete table",
    label: "Delete",
    command: "deleteTable",
    icon: "delete-table",
    tone: "danger",
  },
]) satisfies readonly TableCommand[];

export const TABLE_MENU_COMMAND_SCOPE = Object.freeze({
  cell: TABLE_CELL_MENU_COMMAND_IDS,
  cells: new Set([
    "merge-cells",
    "copy-cell-content",
    "align-left",
    "align-center",
    "align-right",
    "clear-cell-content",
    "clear-cell-style",
    "cell-text-clear",
    "cell-text-muted",
    "cell-text-accent",
    "cell-text-danger",
    "cell-bg-clear",
    "cell-bg-yellow",
    "cell-bg-blue",
    "cell-bg-green",
  ]),
  row: new Set([
    "add-row-before",
    "add-row-after",
    "copy-cell-content",
    "clear-cell-content",
    "clear-cell-style",
    ...TABLE_AXIS_STYLE_COMMAND_IDS,
    "delete-row",
    "toggle-header-row",
  ]),
  column: new Set([
    "add-column-before",
    "add-column-after",
    "copy-cell-content",
    "clear-cell-content",
    "clear-cell-style",
    ...TABLE_AXIS_STYLE_COMMAND_IDS,
    "delete-column",
    "toggle-header-column",
  ]),
  table: new Set([
    "toggle-header-row",
    "toggle-header-column",
    "fix-table",
    "delete-table",
  ]),
}) satisfies Readonly<Record<TableCommandSelectionKind, ReadonlySet<TableCommandId>>>;

export const TABLE_COMMAND_CONTEXT_ORDER = Object.freeze({
  row: [
    "add-row-after",
    "add-row-before",
    "toggle-header-row",
    "copy-cell-content",
    "clear-cell-content",
    "clear-cell-style",
    ...TABLE_AXIS_STYLE_COMMAND_IDS,
    "delete-row",
  ],
  column: [
    "add-column-after",
    "add-column-before",
    "toggle-header-column",
    "copy-cell-content",
    "clear-cell-content",
    "clear-cell-style",
    ...TABLE_AXIS_STYLE_COMMAND_IDS,
    "delete-column",
  ],
  table: [
    "toggle-header-row",
    "toggle-header-column",
    "fix-table",
    "delete-table",
  ],
}) satisfies Readonly<Partial<Record<TableCommandSelectionKind, readonly TableCommandId[]>>>;

export const TABLE_CONTEXT_HEADER_COMMAND_IDS = new Set<TableCommandId>([
  "toggle-header-row",
  "toggle-header-column",
  "toggle-header-cell",
]);

export const SELECTION_TABLE_COMMAND_IDS = new Set<TableCommandId>([
  "merge-cells",
  "split-cell",
  "copy-cell-content",
  "clear-cell-content",
  "clear-cell-style",
  "align-left",
  "align-center",
  "align-right",
  "cell-text-clear",
  "cell-text-muted",
  "cell-text-accent",
  "cell-text-danger",
  "cell-bg-clear",
  "cell-bg-yellow",
  "cell-bg-blue",
  "cell-bg-green",
]);

export const KEYBOARD_TABLE_COMMAND_IDS = new Set<TableCommandId>([
  "add-column-before",
  "add-column-after",
  "delete-column",
  "add-row-before",
  "add-row-after",
  "delete-row",
  "merge-cells",
  "split-cell",
  "copy-cell-content",
  "clear-cell-content",
  "clear-cell-style",
  "toggle-header-row",
  "toggle-header-column",
  "toggle-header-cell",
  "align-left",
  "align-center",
  "align-right",
  "cell-text-clear",
  "cell-text-muted",
  "cell-text-accent",
  "cell-text-danger",
  "cell-bg-clear",
  "cell-bg-yellow",
  "cell-bg-blue",
  "cell-bg-green",
  "fix-table",
  "delete-table",
]);

export function enabledTableCommandIds(
  commands: readonly TableCommand[] | null | undefined,
): TableCommandId[] {
  return (commands ?? [])
    .filter((command) => !command.disabled)
    .map((command) => command.id);
}

export function runTableEditorCommand(
  editor: TableCommandEditor | null | undefined,
  commandName: string,
  args: readonly unknown[] = [],
): boolean {
  const command = editor?.commands?.[commandName];
  if (typeof command !== "function") return false;
  const ok = command(...args) !== false;
  if (ok) editor?.commands?.focus?.();
  return ok;
}

export function canRunTableEditorCommand(
  editor: TableCommandEditor | null | undefined,
  commandName: string,
  args: readonly unknown[] = [],
): boolean {
  if (typeof editor?.commands?.[commandName] !== "function") return false;
  const canCommands = typeof editor?.can === "function" ? editor.can() : null;
  const canCommand = canCommands?.[commandName];
  if (commandName === "splitCell" && typeof canCommand !== "function") {
    return false;
  }
  if (typeof canCommand !== "function") return true;

  try {
    return canCommand(...args) !== false;
  } catch (_error) {
    return false;
  }
}

export function tableCellAttributeValue(
  cell: HTMLElement | null | undefined,
  name: string,
): string | null {
  if (!cell) return null;

  if (name === "backgroundColor") {
    return cell.getAttribute?.("data-cell-background") || cell.style?.backgroundColor || null;
  }

  if (name === "align") {
    return cell.style?.textAlign || cell.getAttribute?.("align") || null;
  }

  return null;
}

export function normalizeTableCellAttributeValue(name: string, value: unknown): unknown {
  if (name === "align") {
    const align = String(value ?? "").trim().toLowerCase();
    return align === "left" ? null : align || null;
  }
  return value ?? null;
}

export function tableCommandVariant(
  command: Partial<TableCommand> | null | undefined,
): TableCommandVariant {
  if (command?.variant) return command.variant;
  const groupKey = command?.groupKey ?? command?.group;
  if (groupKey === "Align") return "icon";
  if (groupKey === "Text color") return "text-swatch";
  if (groupKey === "Cell color") return "swatch";
  return "text";
}

export function tableCommandLayoutGroup(
  command: Partial<TableCommand> | null | undefined,
): TableCommandLayoutGroup {
  if (command?.id === "split-cell") return "actions";
  if (command?.id === "copy-cell-content") return "actions";
  if (command?.id === "clear-cell-content") return "actions";
  if (command?.id === "clear-cell-style") return "actions";
  if (command?.id && TABLE_CONTEXT_HEADER_COMMAND_IDS.has(command.id)) return "actions";
  const variant = tableCommandVariant(command);
  if (variant === "icon") return "align";
  if (variant === "text-swatch") return "text-color";
  if (variant === "swatch") return "cell-color";
  if (command?.tone === "danger") return "danger";
  return "actions";
}

const TABLE_COMMAND_MENU_SECTION_BY_ID = Object.freeze({
  "add-row-after": "structure",
  "add-row-before": "structure",
  "add-column-after": "structure",
  "add-column-before": "structure",
  "toggle-header-row": "structure",
  "toggle-header-column": "structure",
  "toggle-header-cell": "structure",
  "fix-table": "structure",
  "merge-cells": "content",
  "split-cell": "content",
  "copy-cell-content": "content",
  "clear-cell-content": "content",
  "clear-cell-style": "style",
  "align-left": "style",
  "align-center": "style",
  "align-right": "style",
  "cell-text-clear": "style",
  "cell-text-muted": "style",
  "cell-text-accent": "style",
  "cell-text-danger": "style",
  "cell-bg-clear": "style",
  "cell-bg-yellow": "style",
  "cell-bg-blue": "style",
  "cell-bg-green": "style",
  "delete-row": "danger",
  "delete-column": "danger",
  "delete-table": "danger",
}) satisfies Readonly<Partial<Record<TableCommandId, TableCommandMenuSection>>>;

const TABLE_COMMAND_MENU_SECTION_LABELS = Object.freeze({
  structure: "Structure",
  content: "Content",
  style: "Style",
  danger: "Danger",
}) satisfies Readonly<Record<TableCommandMenuSection, string>>;

const TABLE_COMMAND_MENU_SECTION_ORDER = Object.freeze([
  "structure",
  "content",
  "style",
  "danger",
]) satisfies readonly TableCommandMenuSection[];

export function tableCommandMenuSection(
  command: Partial<TableCommand> | null | undefined,
): TableCommandMenuSection {
  if (command?.menuSection) return command.menuSection;
  if (command?.tone === "danger") return "danger";
  return command?.id ? TABLE_COMMAND_MENU_SECTION_BY_ID[command.id] ?? "content" : "content";
}

export function tableCommandMenuSectionLabel(section: string): string {
  return section in TABLE_COMMAND_MENU_SECTION_LABELS
    ? TABLE_COMMAND_MENU_SECTION_LABELS[section as TableCommandMenuSection]
    : section;
}

export function visibleTableCommands(
  commands: readonly TableCommand[] | null | undefined,
  mode: TableCommandMenuMode = "context",
  selectionKind: TableCommandSelectionKind = "cell",
): TableCommand[] {
  const allowed = mode === "keyboard"
    ? KEYBOARD_TABLE_COMMAND_IDS
    : TABLE_MENU_COMMAND_SCOPE[selectionKind] ?? SELECTION_TABLE_COMMAND_IDS;
  const visible = (commands ?? []).filter((command) => {
    if (!allowed.has(command.id)) return false;
    if (mode === "context" && selectionKind === "cell" && command.id === "split-cell") {
      return !command.disabled;
    }
    return true;
  });
  const order = mode === "context" ? TABLE_COMMAND_CONTEXT_ORDER[selectionKind] : null;
  if (!order) return visible;
  return [...visible].sort((left, right) => {
    const leftIndex = order.indexOf(left.id);
    const rightIndex = order.indexOf(right.id);
    return (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex) -
      (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex);
  });
}

export function firstEnabledTableCommandId(
  commands: readonly TableCommand[] | null | undefined,
  mode: TableCommandMenuMode = "context",
  selectionKind: TableCommandSelectionKind = "cell",
): TableCommandId | null {
  return enabledTableCommandIds(visibleTableCommands(commands, mode, selectionKind))[0] ?? null;
}

export function nextEnabledTableCommandId(
  commands: readonly TableCommand[] | null | undefined,
  currentId: string | null | undefined,
  direction: number,
): TableCommandId | null {
  const ids = enabledTableCommandIds(commands);
  if (ids.length === 0) return null;
  const currentIndex = ids.findIndex((id) => id === currentId);
  const startIndex = currentIndex < 0 ? 0 : currentIndex;
  return ids[(startIndex + direction + ids.length) % ids.length];
}

export function normalizeTableMenuMode(mode: unknown): TableCommandMenuMode {
  return mode === "keyboard" ? "keyboard" : "context";
}

export function createTableCommandMenuState(
  commands: readonly TableCommand[] | null | undefined,
  {
    mode = "context",
    selectionKind = "cell",
    activeCommandId = null,
  }: {
    mode?: TableCommandMenuMode | string;
    selectionKind?: TableCommandSelectionKind | null;
    activeCommandId?: string | null;
  } = {},
): TableCommandMenuState {
  const normalizedMode = normalizeTableMenuMode(mode);
  const normalizedSelectionKind = selectionKind ?? "cell";
  const visibleCommands = visibleTableCommands(
    commands,
    normalizedMode,
    normalizedSelectionKind,
  );
  const enabledCommandIds = enabledTableCommandIds(visibleCommands);
  const activeCommandStillValid = visibleCommands.some(
    (command) => command.id === activeCommandId && !command.disabled,
  );

  return {
    mode: normalizedMode,
    selectionKind: normalizedSelectionKind,
    commands: visibleCommands,
    enabledCommandIds,
    activeCommandId: activeCommandStillValid
      ? activeCommandId as TableCommandId
      : enabledCommandIds[0] ?? null,
  };
}

export function groupTableCommandMenuCommands(
  commands: readonly TableCommand[] = [],
): TableCommandMenuGroup[] {
  const groups: TableCommandMenuGroup[] = [];

  (commands ?? []).forEach((command, commandIndex) => {
    const indexedCommand = {
      ...command,
      index: Number.isInteger(command?.index) ? command.index : commandIndex,
    };
    const layoutGroup = command?.layoutGroup ?? tableCommandLayoutGroup(command);
    const menuSection = tableCommandMenuSection(command);
    const groupKey = `${menuSection}:${layoutGroup}`;
    const previous = groups.at(-1);
    const sectionSeen = groups.some((group) => group.menuSection === menuSection);
    if (previous?.groupKey !== groupKey) {
      groups.push({
        groupKey,
        group: tableCommandMenuSectionLabel(menuSection),
        layoutGroup,
        menuSection,
        showLabel: !sectionSeen,
        commands: [],
      });
    }
    groups.at(-1)?.commands.push(indexedCommand);
  });

  return groups;
}

export function createTableCommandMenuModel(
  commands: readonly TableCommand[] | null | undefined,
  {
    mode = "context",
    selectionKind = "cell",
    activeCommandId = null,
    sectionLabel = tableCommandMenuSectionLabel,
  }: {
    mode?: TableCommandMenuMode | string;
    selectionKind?: TableCommandSelectionKind | null;
    activeCommandId?: string | null;
    sectionLabel?: (section: TableCommandMenuSection) => string;
  } = {},
): TableCommandMenuModel {
  const state = createTableCommandMenuState(commands, {
    mode,
    selectionKind,
    activeCommandId,
  });
  const rawGroups = groupTableCommandMenuCommands(state.commands);
  const order = new Map(TABLE_COMMAND_MENU_SECTION_ORDER.map((section, index) => [section, index]));
  const groups = rawGroups
    .map((group) => ({
      ...group,
      group: sectionLabel(group.menuSection),
      order: order.get(group.menuSection) ?? Number.MAX_SAFE_INTEGER,
      layoutGroups: [...new Set(group.commands.map((command) => command.layoutGroup ?? tableCommandLayoutGroup(command)))],
    }))
    .sort((left, right) => left.order - right.order);

  return {
    ...state,
    groups,
  };
}
