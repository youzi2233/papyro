import {
  canRunTableEditorCommand,
  createTableCommandMenuModel,
  TABLE_COMMANDS,
} from "../../tiptap-table-commands.js";
import {
  localizeTableCommand,
  tableCommandMenuSectionLabel,
} from "../../tiptap-i18n.js";

export function normalizeTableCellMenuSelectionKind(selectionKind = "cell") {
  return selectionKind === "cells" ? "cells" : "cell";
}

export function normalizePapyroTableMenuSelectionKind(selectionKind = "cell") {
  if (selectionKind === "cells") return "cells";
  if (selectionKind === "row") return "row";
  if (selectionKind === "column") return "column";
  if (selectionKind === "table") return "table";
  return "cell";
}

export function createPapyroTableCommandMenuModel({
  editor = null,
  language = "english",
  selectionKind = "cell",
  activeCommandId = null,
} = {}) {
  const localizedCommands = TABLE_COMMANDS.map((command) => {
    const disabled = !canRunTableEditorCommand(
      editor,
      command.command,
      command.args ?? [],
    );
    return localizeTableCommand({ ...command, disabled }, language);
  });

  return createTableCommandMenuModel(localizedCommands, {
    mode: "context",
    selectionKind: normalizePapyroTableMenuSelectionKind(selectionKind),
    activeCommandId,
    sectionLabel: (section) => tableCommandMenuSectionLabel(language, section),
  });
}

export function createTableCellHandleCommandMenuModel(options = {}) {
  return createPapyroTableCommandMenuModel({
    ...options,
    selectionKind: normalizeTableCellMenuSelectionKind(options.selectionKind),
  });
}
