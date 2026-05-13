type HistoryCommandId = "undo" | "redo";
type HistoryCommand = Readonly<{
  id: HistoryCommandId;
  title: string;
  commandName: HistoryCommandId;
}>;
type HistoryCommandResult = Readonly<{
  ok: boolean;
  commandId: string;
  error: "history_command_failed" | "unknown_history_command" | null;
}>;
type TiptapHistoryEditor = {
  commands?: Partial<Record<HistoryCommandId | "focus", () => boolean | void>>;
};
type HistoryCommandContext = {
  editor?: TiptapHistoryEditor | null;
};

function normalizeCommandId(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function editorCommand(editor: TiptapHistoryEditor | null | undefined, commandName: HistoryCommandId) {
  const command = editor?.commands?.[commandName];
  if (typeof command !== "function") return false;
  return command() !== false;
}

function focusEditor(editor: TiptapHistoryEditor | null | undefined) {
  editor?.commands?.focus?.();
}

export const PAPYRO_TIPTAP_HISTORY_COMMANDS: readonly HistoryCommand[] = Object.freeze([
  Object.freeze({
    id: "undo",
    title: "Undo",
    commandName: "undo",
  }),
  Object.freeze({
    id: "redo",
    title: "Redo",
    commandName: "redo",
  }),
]);

export class TiptapHistoryCommandController {
  #commands: readonly HistoryCommand[];

  constructor(commands: readonly HistoryCommand[] = PAPYRO_TIPTAP_HISTORY_COMMANDS) {
    this.#commands = Object.freeze([...commands]);
  }

  get commands() {
    return this.#commands;
  }

  find(commandId: unknown) {
    const id = normalizeCommandId(commandId);
    return this.#commands.find((command) => command.id === id) ?? null;
  }

  run(commandId: unknown, context: HistoryCommandContext = {}): HistoryCommandResult {
    const command = this.find(commandId);
    if (!command) {
      return {
        ok: false,
        commandId,
        error: "unknown_history_command",
      };
    }

    const ok = editorCommand(context.editor, command.commandName);
    if (ok) focusEditor(context.editor);

    return {
      ok,
      commandId: command.id,
      error: ok ? null : "history_command_failed",
    };
  }
}

export function createTiptapHistoryCommandController(commands?: readonly HistoryCommand[]) {
  return new TiptapHistoryCommandController(commands);
}
