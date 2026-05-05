function normalizeCommandId(value) {
  return String(value ?? "").trim().toLowerCase();
}

function freezeCommand(command) {
  return Object.freeze({ ...command });
}

function editorCommand(editor, commandName, ...args) {
  const command = editor?.commands?.[commandName];
  if (typeof command !== "function") {
    return false;
  }
  return command(...args) !== false;
}

function focusEditor(editor, pos = null) {
  if (Number.isFinite(pos)) {
    editor?.commands?.focus?.(pos);
  } else {
    editor?.commands?.focus?.();
  }
}

function insertMarkdownAt(editor, markdown, pos) {
  if (typeof editor?.commands?.insertContentAt === "function" && Number.isFinite(pos)) {
    return editor.commands.insertContentAt(pos, markdown, { contentType: "markdown" }) !== false;
  }
  return editorCommand(editor, "insertContent", markdown, { contentType: "markdown" });
}

function targetEndPos(target) {
  const nodeSize = target?.node?.nodeSize ?? target?.block?.pmViewDesc?.node?.nodeSize ?? 0;
  return Number.isFinite(target?.pos) ? target.pos + Math.max(1, nodeSize) : null;
}

function deleteTarget(editor, target) {
  const from = target?.pos;
  const to = targetEndPos(target);
  if (Number.isFinite(from) && Number.isFinite(to) && to > from) {
    return editorCommand(editor, "deleteRange", { from, to });
  }
  return editorCommand(editor, "deleteNode", target?.kind);
}

function createCommand({ id, title, description, group, tone = "default", run }) {
  if (!id || typeof run !== "function") {
    throw new TypeError("Tiptap block actions require an id and run function");
  }

  return freezeCommand({
    id,
    title,
    description,
    group,
    tone,
    run,
  });
}

export const PAPYRO_TIPTAP_BLOCK_ACTIONS = Object.freeze([
  createCommand({
    id: "insert-before",
    title: "Insert above",
    description: "Add a paragraph before this block",
    group: "Insert",
    run: ({ editor, target }) => insertMarkdownAt(editor, "\n", target?.pos),
  }),
  createCommand({
    id: "insert-after",
    title: "Insert below",
    description: "Add a paragraph after this block",
    group: "Insert",
    run: ({ editor, target }) => insertMarkdownAt(editor, "\n", targetEndPos(target)),
  }),
  createCommand({
    id: "paragraph",
    title: "Turn into paragraph",
    description: "Use plain body text",
    group: "Transform",
    run: ({ editor }) => editorCommand(editor, "setParagraph"),
  }),
  createCommand({
    id: "heading-2",
    title: "Turn into heading",
    description: "Use a medium section title",
    group: "Transform",
    run: ({ editor }) => editorCommand(editor, "toggleHeading", { level: 2 }),
  }),
  createCommand({
    id: "delete",
    title: "Delete block",
    description: "Remove this block",
    group: "Danger",
    tone: "danger",
    run: ({ editor, target }) => deleteTarget(editor, target),
  }),
]);

export class TiptapBlockActionController {
  #commands;

  constructor(commands = PAPYRO_TIPTAP_BLOCK_ACTIONS) {
    this.#commands = Object.freeze([...commands]);
  }

  get commands() {
    return this.#commands;
  }

  find(commandId) {
    const id = normalizeCommandId(commandId);
    return this.#commands.find((command) => command.id === id) ?? null;
  }

  list() {
    return this.#commands.map((command) => ({
      id: command.id,
      title: command.title,
      description: command.description,
      group: command.group,
      tone: command.tone,
    }));
  }

  run(commandId, context = {}) {
    const command = this.find(commandId);
    if (!command) {
      return {
        ok: false,
        commandId,
        error: "unknown_block_action",
      };
    }

    focusEditor(context.editor, context.target?.pos);
    const ok = command.run(context) !== false;
    if (ok) {
      focusEditor(context.editor);
    }

    return {
      ok,
      commandId: command.id,
      error: ok ? null : "block_action_failed",
    };
  }
}

export function createTiptapBlockActionController(commands) {
  return new TiptapBlockActionController(commands);
}
