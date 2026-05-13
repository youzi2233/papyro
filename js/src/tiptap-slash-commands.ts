import {
  createMarkdownCallout,
  createMarkdownTable,
  normalizeCalloutKind,
} from "./tiptap-markdown-snippets.ts";
import { normalizeCodeBlockLanguage } from "./tiptap-code-block.ts";
import { localizeSlashCommand, normalizeTiptapLanguage } from "./tiptap-i18n.ts";
import type { PapyroCalloutKind } from "./tiptap-markdown-snippets.ts";
import type { TiptapLanguage } from "./tiptap-i18n.ts";

const DEFAULT_LIMIT = 8;
const DEFAULT_RECENT_LIMIT = 4;
const RECENT_GROUP = "Recent";

type EditorCommandMap = Record<string, (...args: unknown[]) => unknown>;
type SlashEditor = {
  commands?: EditorCommandMap;
};
type TableSize = {
  rows?: unknown;
  cols?: unknown;
};
type SlashCommandContext = {
  editor?: SlashEditor | null;
  entry?: unknown;
  tableSize?: TableSize | null;
  calloutKind?: unknown;
  codeLanguage?: unknown;
  [key: string]: unknown;
};
type SlashCommandRun = (context: SlashCommandContext) => boolean;
type SlashCommandInput = {
  id: string;
  title: string;
  description: string;
  group: string;
  icon?: string;
  aliases?: readonly string[];
  keywords?: readonly string[];
  priority?: number;
  run: SlashCommandRun;
};
export type PapyroSlashCommand = Readonly<{
  id: string;
  title: string;
  description: string;
  group: string;
  icon: string;
  aliases: readonly string[];
  keywords: readonly string[];
  priority: number;
  run: SlashCommandRun;
}>;
type SlashCommandMatch = {
  command: PapyroSlashCommand;
  index: number;
  score: number;
};
export type PapyroVisibleSlashCommand = PapyroSlashCommand & {
  index: number;
  sourceIndex: number;
  recent: boolean;
};
type QueryOptions = {
  limit?: unknown;
  language?: unknown;
};
type ControllerOptions = {
  language?: unknown;
  recentLimit?: unknown;
};

function normalizeText(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function freezeCommand(command: SlashCommandInput): PapyroSlashCommand {
  return Object.freeze({
    ...command,
    aliases: Object.freeze([...(command.aliases ?? [])]),
    keywords: Object.freeze([...(command.keywords ?? [])]),
    icon: command.icon ?? "paragraph",
    priority: command.priority ?? 100,
  });
}

function editorCommand(
  editor: SlashEditor | null | undefined,
  commandName: string,
  ...args: unknown[]
): boolean {
  const command = editor?.commands?.[commandName];
  if (typeof command !== "function") {
    return false;
  }
  return command(...args) !== false;
}

function insertMarkdown(editor: SlashEditor | null | undefined, markdown: string): boolean {
  return editorCommand(editor, "insertContent", markdown, { contentType: "markdown" });
}

export { createMarkdownCallout, createMarkdownTable };


function focusEditor(editor: SlashEditor | null | undefined) {
  editor?.commands?.focus?.();
}

function runEditorCommand(
  editor: SlashEditor | null | undefined,
  commandName: string,
  args: readonly unknown[] = [],
  fallbackMarkdown?: string,
): boolean {
  const ok = editorCommand(editor, commandName, ...args);
  if (!ok && fallbackMarkdown) {
    return insertMarkdown(editor, fallbackMarkdown);
  }
  return ok;
}

function normalizeSlashCodeLanguage(language: unknown): string | null {
  const raw = String(language ?? "").trim().toLowerCase();
  if (!raw || raw === "auto") return null;
  return normalizeCodeBlockLanguage(raw);
}

export function createMarkdownCodeBlock(language: unknown = null): string {
  const normalized = normalizeSlashCodeLanguage(language);
  return `\`\`\`${normalized ?? ""}\ncode\n\`\`\``;
}

function commandSearchText(command: PapyroSlashCommand): string {
  return [
    command.id,
    command.title,
    command.description,
    command.group,
    ...command.aliases,
    ...command.keywords,
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ");
}

function scoreCommand(command: PapyroSlashCommand, query: unknown): number | null {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return command.priority ?? 100;

  const title = normalizeText(command.title);
  const id = normalizeText(command.id);
  const aliases = command.aliases.map(normalizeText);
  const keywords = command.keywords.map(normalizeText);
  const haystack = commandSearchText(command);

  if (id === normalizedQuery || aliases.includes(normalizedQuery)) return 0;
  if (title === normalizedQuery) return 1;
  if (id.startsWith(normalizedQuery)) return 2;
  if (title.startsWith(normalizedQuery)) return 3;
  if (aliases.some((alias) => alias.startsWith(normalizedQuery))) return 4;
  if (keywords.some((keyword) => keyword.startsWith(normalizedQuery))) return 5;
  if (haystack.includes(normalizedQuery)) return 6;
  return null;
}

function sortCommandMatches(
  matches: readonly SlashCommandMatch[],
  query: unknown,
  recentCommandIds: readonly string[] = [],
): SlashCommandMatch[] {
  const normalizedQuery = normalizeText(query);
  const recentOrder = new Map(recentCommandIds.map((id, index) => [id, index]));
  return [...matches].sort((a, b) => {
    if (!normalizedQuery) {
      const leftRecent = recentOrder.get(a.command.id) ?? Number.POSITIVE_INFINITY;
      const rightRecent = recentOrder.get(b.command.id) ?? Number.POSITIVE_INFINITY;
      if (leftRecent !== rightRecent) return leftRecent - rightRecent;
    }
    return a.score - b.score || a.command.priority - b.command.priority || a.index - b.index;
  });
}

function localizeQueryMatch(
  match: SlashCommandMatch,
  visibleIndex: number,
  {
    locale,
    recentCommandIds = [],
    query = "",
  }: {
    locale: TiptapLanguage;
    recentCommandIds?: readonly string[];
    query?: unknown;
  },
): PapyroVisibleSlashCommand {
  const normalizedQuery = normalizeText(query);
  const recent = !normalizedQuery && recentCommandIds.includes(match.command.id);
  const command = recent
    ? {
        ...match.command,
        group: RECENT_GROUP,
        sourceGroup: match.command.group,
      }
    : match.command;

  return {
    ...(localizeSlashCommand(command, locale) as PapyroSlashCommand),
    index: visibleIndex,
    sourceIndex: match.index,
    recent,
  };
}

function createCommand({
  id,
  title,
  description,
  group,
  icon = "paragraph",
  aliases = [],
  keywords = [],
  priority = 100,
  run,
}: SlashCommandInput): PapyroSlashCommand {
  if (!id || typeof run !== "function") {
    throw new TypeError("Tiptap slash commands require an id and run function");
  }

  return freezeCommand({
    id,
    title,
    description,
    group,
    icon,
    aliases,
    keywords,
    priority,
    run,
  });
}

export const PAPYRO_TIPTAP_SLASH_COMMANDS = Object.freeze([
  createCommand({
    id: "paragraph",
    title: "Paragraph",
    description: "Write plain body text",
    group: "Text",
    icon: "paragraph",
    aliases: ["p", "text"],
    keywords: ["body", "normal", "文本", "正文", "段落"],
    priority: 10,
    run: ({ editor }) => runEditorCommand(editor, "setParagraph"),
  }),
  createCommand({
    id: "heading-1",
    title: "Heading 1",
    description: "Large section title",
    group: "Text",
    icon: "heading-1",
    aliases: ["h1", "title"],
    keywords: ["heading", "headline", "标题", "一级标题"],
    priority: 20,
    run: ({ editor }) => runEditorCommand(editor, "toggleHeading", [{ level: 1 }], "# "),
  }),
  createCommand({
    id: "heading-2",
    title: "Heading 2",
    description: "Medium section title",
    group: "Text",
    icon: "heading-2",
    aliases: ["h2", "subtitle"],
    keywords: ["heading", "section", "标题", "二级标题"],
    priority: 21,
    run: ({ editor }) => runEditorCommand(editor, "toggleHeading", [{ level: 2 }], "## "),
  }),
  createCommand({
    id: "heading-3",
    title: "Heading 3",
    description: "Small section title",
    group: "Text",
    icon: "heading-3",
    aliases: ["h3"],
    keywords: ["heading", "subsection", "标题", "三级标题"],
    priority: 22,
    run: ({ editor }) => runEditorCommand(editor, "toggleHeading", [{ level: 3 }], "### "),
  }),
  createCommand({
    id: "bullet-list",
    title: "Bullet list",
    description: "Create an unordered list",
    group: "Lists",
    icon: "bullet-list",
    aliases: ["ul", "list"],
    keywords: ["bullet", "unordered", "列表", "无序列表"],
    priority: 30,
    run: ({ editor }) => runEditorCommand(editor, "toggleBulletList", [], "- "),
  }),
  createCommand({
    id: "ordered-list",
    title: "Ordered list",
    description: "Create a numbered list",
    group: "Lists",
    icon: "ordered-list",
    aliases: ["ol", "numbered"],
    keywords: ["number", "ordered", "列表", "有序列表"],
    priority: 31,
    run: ({ editor }) => runEditorCommand(editor, "toggleOrderedList", [], "1. "),
  }),
  createCommand({
    id: "task-list",
    title: "Task list",
    description: "Insert Markdown checkboxes",
    group: "Lists",
    icon: "task-list",
    aliases: ["todo", "checkbox"],
    keywords: ["task", "check", "待办", "任务", "复选框"],
    priority: 32,
    run: ({ editor }) => insertMarkdown(editor, "- [ ] "),
  }),
  createCommand({
    id: "blockquote",
    title: "Quote",
    description: "Highlight a quoted passage",
    group: "Blocks",
    icon: "quote",
    aliases: ["quote"],
    keywords: ["blockquote", "引用"],
    priority: 40,
    run: ({ editor }) => runEditorCommand(editor, "toggleBlockquote", [], "> "),
  }),
  createCommand({
    id: "callout",
    title: "Callout",
    description: "Insert a note callout",
    group: "Blocks",
    icon: "callout",
    aliases: ["note", "alert", "admonition"],
    keywords: ["callout", "notice", "tip", "warning"],
    priority: 41,
    run: ({ editor, calloutKind = "NOTE" }) => {
      const kind: PapyroCalloutKind = normalizeCalloutKind(calloutKind);
      return runEditorCommand(
        editor,
        "setCalloutBlock",
        [{ kind, text: "Callout text" }],
        createMarkdownCallout(kind),
      );
    },
  }),
  createCommand({
    id: "code-block",
    title: "Code block",
    description: "Insert a fenced code block",
    group: "Blocks",
    icon: "code-block",
    aliases: ["code", "fence"],
    keywords: ["programming", "代码", "代码块"],
    priority: 42,
    run: ({ editor, codeLanguage = null }) => {
      const language = normalizeSlashCodeLanguage(codeLanguage);
      return runEditorCommand(
        editor,
        "toggleCodeBlock",
        language ? [{ language }] : [],
        createMarkdownCodeBlock(language),
      );
    },
  }),
  createCommand({
    id: "divider",
    title: "Divider",
    description: "Insert a horizontal rule",
    group: "Blocks",
    icon: "divider",
    aliases: ["hr", "line"],
    keywords: ["separator", "rule", "分割线"],
    priority: 43,
    run: ({ editor }) => runEditorCommand(editor, "setHorizontalRule", [], "\n---\n"),
  }),
  createCommand({
    id: "table",
    title: "Table",
    description: "Insert a simple Markdown table",
    group: "Data",
    icon: "table",
    aliases: ["grid"],
    keywords: ["cells", "表格"],
    priority: 50,
    run: ({ editor, tableSize = {} }) => {
      const requestedSize = tableSize ?? {};
      const rows = Math.max(1, Number(requestedSize.rows) || 3);
      const cols = Math.max(1, Number(requestedSize.cols) || 2);
      const ok = runEditorCommand(
        editor,
        "insertTable",
        [{ rows, cols, withHeaderRow: true }],
        createMarkdownTable(rows, cols),
      );
      return ok;
    },
  }),
  createCommand({
    id: "image",
    title: "Image",
    description: "Insert Markdown image syntax",
    group: "Media",
    icon: "image",
    aliases: ["img", "picture"],
    keywords: ["media", "asset", "图片", "图像"],
    priority: 51,
    run: ({ editor }) =>
      runEditorCommand(
        editor,
        "setImage",
        [{ src: "assets/image.png", alt: "alt text", title: "" }],
        "![alt text](assets/image.png)",
      ),
  }),
  createCommand({
    id: "math-block",
    title: "Math block",
    description: "Insert a display formula",
    group: "Advanced",
    icon: "math",
    aliases: ["math", "formula"],
    keywords: ["latex", "equation", "公式", "数学"],
    priority: 52,
    run: ({ editor }) =>
      runEditorCommand(editor, "setMathBlock", [{ source: "x^2 + y^2 = z^2" }], "\n$$\n\n$$\n"),
  }),
  createCommand({
    id: "mermaid",
    title: "Mermaid diagram",
    description: "Insert a Mermaid code fence",
    group: "Advanced",
    icon: "mermaid",
    aliases: ["diagram", "flowchart"],
    keywords: ["chart", "graph", "图表", "流程图"],
    priority: 53,
    run: ({ editor }) =>
      runEditorCommand(
        editor,
        "setMermaidBlock",
        [{ source: "flowchart TD\n  A --> B" }],
        "\n```mermaid\nflowchart TD\n  A --> B\n```\n",
      ),
  }),
]);

export class TiptapSlashCommandController {
  #commands: readonly PapyroSlashCommand[];
  #language: TiptapLanguage;
  #recentCommandIds: string[] = [];
  #recentLimit: number;

  constructor(
    commands: readonly PapyroSlashCommand[] = PAPYRO_TIPTAP_SLASH_COMMANDS,
    { language = "english", recentLimit = DEFAULT_RECENT_LIMIT }: ControllerOptions = {},
  ) {
    this.#commands = Object.freeze([...commands]);
    this.#language = normalizeTiptapLanguage(language);
    this.#recentLimit = Math.max(0, Number(recentLimit) || 0);
  }

  get commands() {
    return this.#commands;
  }

  get recentCommandIds(): string[] {
    return [...this.#recentCommandIds];
  }

  find(commandId: unknown): PapyroSlashCommand | null {
    const id = normalizeText(commandId);
    return this.#commands.find((command) => command.id === id) ?? null;
  }

  setLanguage(language: unknown) {
    this.#language = normalizeTiptapLanguage(language);
  }

  recordUsage(commandId: unknown): string[] {
    const command = this.find(commandId);
    if (!command || this.#recentLimit <= 0) {
      return this.recentCommandIds;
    }

    this.#recentCommandIds = [
      command.id,
      ...this.#recentCommandIds.filter((id) => id !== command.id),
    ].slice(0, this.#recentLimit);
    return this.recentCommandIds;
  }

  query(
    query: unknown,
    { limit = DEFAULT_LIMIT, language = this.#language }: QueryOptions = {},
  ): PapyroVisibleSlashCommand[] {
    const locale = normalizeTiptapLanguage(language);
    const matches = this.#commands
      .map((command, index) => ({
        command,
        index,
        score: scoreCommand(command, query),
      }))
      .filter((match): match is SlashCommandMatch => match.score !== null)
      .sort((a, b) => a.index - b.index);

    return sortCommandMatches(matches, query, this.#recentCommandIds)
      .slice(0, Math.max(0, Number(limit)))
      .map((match, visibleIndex) =>
        localizeQueryMatch(match, visibleIndex, {
          locale,
          query,
          recentCommandIds: this.#recentCommandIds,
        }),
      );
  }

  run(commandId: unknown, context: SlashCommandContext = {}) {
    const command = this.find(commandId);
    if (!command) {
      return {
        ok: false,
        error: "unknown_slash_command",
        commandId,
      };
    }

    const ok = command.run(context) !== false;
    if (ok) {
      this.recordUsage(command.id);
      focusEditor(context.editor);
    }

    return {
      ok,
      commandId: command.id,
      error: ok ? null : "slash_command_failed",
    };
  }
}

export function createTiptapSlashCommandController(
  commands?: readonly PapyroSlashCommand[],
) {
  return new TiptapSlashCommandController(commands);
}
