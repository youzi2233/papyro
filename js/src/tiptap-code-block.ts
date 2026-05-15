import {
  findChildren,
  mergeAttributes,
  type Editor,
  type NodeViewRenderer,
  type NodeViewRendererProps,
} from "@tiptap/core";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { EditorState } from "@tiptap/pm/state";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { all, createLowlight } from "lowlight";
import { localizedText } from "./tiptap-i18n.ts";
import {
  commandElementId,
  createFloatingDismissController,
  defaultDocument,
  defaultWindow,
  isComposingKeyboardEvent,
  positionFloatingElement,
  setHidden,
  syncMenuActiveDescendant,
  viewportSize,
} from "./tiptap-ui-primitives.ts";

const DEFAULT_CODE_LANGUAGE = null;
const DEFAULT_TAB_SIZE = 2;
const LANGUAGE_CLASS_PREFIX = "language-";
const LANGUAGE_MENU_WIDTH = 268;
const LANGUAGE_MENU_HEIGHT = 366;
const COPY_FEEDBACK_MS = 1400;
const codeBlockLowlight = createLowlight(all);
const CODE_HIGHLIGHT_PLUGIN_KEY = "papyroCodeHighlight";
const CODE_LANGUAGE_MENU_OWNER_ID_PREFIX = "mn-tiptap-code-language-menu";
let codeLanguageMenuSequence = 0;

export type PapyroCodeBlockLanguage = string | null;

export type PapyroCodeLanguageOption = Readonly<{
  id: string;
  label: string;
  language: PapyroCodeBlockLanguage;
}>;

type PapyroCodeBlockAttrs = Record<string, unknown> & {
  language?: unknown;
};

type PapyroCodeBlockNode = {
  attrs?: PapyroCodeBlockAttrs;
  textContent?: string;
  type?: {
    name?: string;
  } | string;
};

type PapyroCodeBlockDoc = ProseMirrorNode & {
  nodeAt?: (pos: number) => PapyroCodeBlockNode | null;
};

type PapyroCodeBlockState = Partial<EditorState> & {
  doc?: PapyroCodeBlockDoc;
  selection?: Partial<EditorState["selection"]> & {
    from?: number;
    $from?: {
      depth: number;
      node: (depth: number) => PapyroCodeBlockNode | null | undefined;
      before: (depth: number) => number;
    };
  };
  tr?: {
    setNodeMarkup: (
      pos: number,
      type?: unknown,
      attrs?: Record<string, unknown>,
    ) => unknown;
  };
};

type PapyroCodeBlockEditor = Partial<Editor> & {
  state?: PapyroCodeBlockState;
  view?: {
    dom?: PapyroCodeBlockElement | null;
    dispatch?: (transaction: any) => unknown;
    nodeDOM?: (pos: number) => Node | null;
  } | null;
  commands?: {
    focus?: (...args: unknown[]) => unknown;
  };
};

type PapyroNodeViewRendererResult = ReturnType<NodeViewRenderer>;

type PapyroCodeBlockElement = Record<string, any> & {
  dataset: Record<string, string | undefined>;
};

type PapyroCodeBlockDocument = Record<string, any> & {
  body?: PapyroCodeBlockElement | null;
  documentElement?: {
    clientWidth?: number;
    clientHeight?: number;
    lang?: string;
  };
  createElement?: (tagName: string) => PapyroCodeBlockElement;
};

type PapyroCodeBlockWindow = Record<string, any> & {
  setTimeout?: (handler: () => void, timeout?: number) => number;
  clearTimeout?: (handle?: number | null) => void;
};

export type PapyroCodeBlockOptions = {
  defaultLanguage: string | null;
  enableTabIndentation: boolean;
  tabSize: number;
  lowlight: typeof codeBlockLowlight;
  languageClassPrefix: string;
  HTMLAttributes: Record<string, string>;
};

export type PapyroCodeBlockNodeViewOptions = Partial<PapyroCodeBlockOptions> & Record<string, unknown>;

type PapyroCodeBlockNodeViewInput = {
  editor?: PapyroCodeBlockEditor | null;
  node?: PapyroCodeBlockNode | null;
  getPos?: (() => number | undefined) | null;
  view?: {
    dom?: PapyroCodeBlockElement | null;
  } | null;
  options?: PapyroCodeBlockNodeViewOptions;
};

type PapyroCodeBlockLanguageCommand = {
  id: string;
  run: () => boolean;
};

type LowlightNode = {
  children?: LowlightNode[];
  properties?: {
    className?: string | string[];
  };
  value?: unknown;
};

type FlattenedLowlightNode = {
  text: string;
  className: string;
};

export const PAPYRO_CODE_LANGUAGE_OPTIONS: readonly PapyroCodeLanguageOption[] = Object.freeze([
  { id: "auto", label: "Auto detect", language: null },
  { id: "plaintext", label: "Plain text", language: "plaintext" },
  { id: "javascript", label: "JavaScript", language: "javascript" },
  { id: "typescript", label: "TypeScript", language: "typescript" },
  { id: "rust", label: "Rust", language: "rust" },
  { id: "python", label: "Python", language: "python" },
  { id: "go", label: "Go", language: "go" },
  { id: "json", label: "JSON", language: "json" },
  { id: "bash", label: "Bash", language: "bash" },
  { id: "markdown", label: "Markdown", language: "markdown" },
  { id: "html", label: "HTML", language: "html" },
  { id: "css", label: "CSS", language: "css" },
  { id: "sql", label: "SQL", language: "sql" },
  { id: "yaml", label: "YAML", language: "yaml" },
  { id: "toml", label: "TOML", language: "toml" },
  { id: "jsx", label: "JSX", language: "jsx" },
  { id: "tsx", label: "TSX", language: "tsx" },
  { id: "java", label: "Java", language: "java" },
  { id: "c", label: "C", language: "c" },
  { id: "cpp", label: "C++", language: "cpp" },
  { id: "csharp", label: "C#", language: "csharp" },
  { id: "powershell", label: "PowerShell", language: "powershell" },
  { id: "scss", label: "SCSS", language: "scss" },
  { id: "dockerfile", label: "Dockerfile", language: "dockerfile" },
  { id: "diff", label: "Diff", language: "diff" },
  { id: "ruby", label: "Ruby", language: "ruby" },
  { id: "php", label: "PHP", language: "php" },
  { id: "swift", label: "Swift", language: "swift" },
  { id: "kotlin", label: "Kotlin", language: "kotlin" },
  { id: "dart", label: "Dart", language: "dart" },
  { id: "graphql", label: "GraphQL", language: "graphql" },
  { id: "ini", label: "INI", language: "ini" },
]);

export const PAPYRO_CODE_LANGUAGE_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  ts: "typescript",
  js: "javascript",
  golang: "go",
  md: "markdown",
  yml: "yaml",
  xml: "html",
  ps1: "powershell",
  shellscript: "bash",
  docker: "dockerfile",
  dockerfile: "dockerfile",
  cplusplus: "cpp",
  "c++": "cpp",
  cs: "csharp",
  "c#": "csharp",
  gql: "graphql",
});

export function normalizeCodeBlockLanguage(language: unknown): PapyroCodeBlockLanguage {
  const normalized = String(language ?? "").trim().toLowerCase();
  if (!normalized) return null;
  if (!/^[a-z0-9_+.-]{1,48}$/u.test(normalized)) return null;
  return PAPYRO_CODE_LANGUAGE_ALIASES[normalized] ?? normalized;
}

export function codeBlockLanguageLabel(language: unknown): string {
  const normalized = normalizeCodeBlockLanguage(language);
  return normalized ?? "auto";
}

export function inferCodeBlockLanguage(source: unknown): PapyroCodeBlockLanguage {
  const text = String(source ?? "");
  if (!text.trim()) return null;

  try {
    const result = codeBlockLowlight.highlightAuto(text);
    const detected = normalizeCodeBlockLanguage(result?.data?.language);
    const relevance = Number(result?.data?.relevance ?? 0);
    if (!detected || relevance < 4) return null;
    return detected;
  } catch (_error) {
    return null;
  }
}

export function codeBlockLanguageOption(language: unknown): PapyroCodeLanguageOption | null {
  const normalized = normalizeCodeBlockLanguage(language);
  return PAPYRO_CODE_LANGUAGE_OPTIONS.find(
    (option) => normalizeCodeBlockLanguage(option.language) === normalized || option.id === normalized,
  ) ?? null;
}

export function codeBlockLanguageOptionToken(optionOrLanguage: unknown): string {
  const option = (
    typeof optionOrLanguage === "object" && optionOrLanguage
      ? optionOrLanguage
      : codeBlockLanguageOption(optionOrLanguage)
  ) as Partial<PapyroCodeLanguageOption> | null;
  const normalized = normalizeCodeBlockLanguage(option?.language ?? optionOrLanguage);
  const id = String(option?.id ?? normalized ?? "auto").trim().toLowerCase();
  const tokens: Readonly<Record<string, string>> = {
    auto: "AU",
    plaintext: "TXT",
    javascript: "JS",
    typescript: "TS",
    jsx: "JSX",
    tsx: "TSX",
    markdown: "MD",
    python: "PY",
    rust: "RS",
    bash: "SH",
    powershell: "PS",
    yaml: "YML",
    dockerfile: "DO",
    csharp: "C#",
    cpp: "C++",
  };
  return tokens[id] ?? (normalized ? tokens[normalized] : undefined) ?? String(normalized ?? id).slice(0, 3).toUpperCase();
}

function safeEditorView(editor: PapyroCodeBlockEditor | null | undefined) {
  if (!editor) return null;
  try {
    return editor.view ?? null;
  } catch (_error) {
    return null;
  }
}

function codeBlockHighlightLanguage(language: unknown): PapyroCodeBlockLanguage {
  const normalized = normalizeCodeBlockLanguage(language);
  if (normalized === "plaintext") return null;
  return lowlightLanguageName(normalized);
}

export function codeBlockLanguageDisplayLabel(
  language: unknown,
  value: unknown,
  detectedLanguage: unknown = null,
): string {
  const normalized = normalizeCodeBlockLanguage(value);
  const detected = normalizeCodeBlockLanguage(detectedLanguage);
  const option = codeBlockLanguageOption(normalized);
  if (option?.id === "auto" || !normalized) {
    if (detected) {
      const detectedLabel = codeBlockLanguageOption(detected)?.label ?? detected;
      return localizedText(
        language,
        `Auto · ${detectedLabel}`,
        `自动 · ${detectedLabel}`,
      );
    }
    return localizedText(language, "Auto", "自动");
  }
  if (option?.id === "plaintext") {
    return localizedText(language, "Plain text", "纯文本");
  }
  return option?.label ?? normalized;
}

function editorLanguage(
  editor: PapyroCodeBlockEditor | null | undefined,
  view: { dom?: PapyroCodeBlockElement | null } | null = null,
): string {
  const dom = view?.dom ?? safeEditorView(editor)?.dom ?? null;
  const root =
    dom?.closest?.(".mn-tiptap-runtime") ??
    dom?.parentElement ??
    null;
  return root?.dataset?.language ?? dom?.ownerDocument?.documentElement?.lang ?? "english";
}

function codeLanguageMenuLabel(language: unknown): string {
  return localizedText(language, "Code language", "代码语言");
}

function codeLanguageButtonAriaLabel(language: unknown): string {
  return localizedText(language, "Change code language", "修改代码语言");
}

export function codeBlockCopyLabel(language: unknown): string {
  return localizedText(language, "Copy code", "\u590d\u5236\u4ee3\u7801");
}

export function codeBlockCopiedLabel(language: unknown): string {
  return localizedText(language, "Copied", "\u5df2\u590d\u5236");
}

export function codeBlockCopyFailedLabel(language: unknown): string {
  return localizedText(language, "Copy failed", "\u590d\u5236\u5931\u8d25");
}

export function codeBlockWrapLabel(language: unknown, wrapped: boolean): string {
  return wrapped
    ? localizedText(language, "Disable line wrap", "\u5173\u95ed\u81ea\u52a8\u6362\u884c")
    : localizedText(language, "Wrap lines", "\u81ea\u52a8\u6362\u884c");
}

export function codeBlockLanguageUiLabel(language: unknown, value: unknown): string {
  return codeBlockLanguageDisplayLabel(language, value);
}

function languageClassName(language: unknown, prefix = LANGUAGE_CLASS_PREFIX): string {
  const normalized = normalizeCodeBlockLanguage(language);
  const highlighted = highlightedDisplayLanguage(lowlightLanguageName(normalized));
  return highlighted ? `${prefix}${highlighted}` : "";
}

function lowlightLanguageName(language: unknown): PapyroCodeBlockLanguage {
  const normalized = normalizeCodeBlockLanguage(language);
  if (normalized === "plaintext") return null;
  if (normalized === "html") return "xml";
  if (normalized === "tsx") return "typescript";
  if (normalized === "jsx") return "javascript";
  return normalized;
}

function highlightedDisplayLanguage(language: unknown): PapyroCodeBlockLanguage {
  const normalized = normalizeCodeBlockLanguage(language);
  return normalized;
}

export function codeBlockHighlightedLanguage(language: unknown): PapyroCodeBlockLanguage {
  return highlightedDisplayLanguage(lowlightLanguageName(language));
}

export function codeBlockDomAttributes({
  language = "english",
  node = null,
  value = undefined,
  detectedLanguage = undefined,
  wrapped = undefined,
}: {
  language?: unknown;
  node?: PapyroCodeBlockNode | null;
  value?: unknown;
  detectedLanguage?: unknown;
  wrapped?: boolean;
} = {}): Record<string, string> {
  const codeLanguage = normalizeCodeBlockLanguage(value ?? node?.attrs?.language);
  const detected =
    detectedLanguage === undefined
      ? codeLanguage
        ? null
        : inferCodeBlockLanguage(node?.textContent)
      : normalizeCodeBlockLanguage(detectedLanguage);
  const highlightedLanguage = codeBlockHighlightedLanguage(codeLanguage ?? detected);
  const label = codeBlockLanguageDisplayLabel(language, codeLanguage, detected);
  const attributes: Record<string, string> = {
    "data-has-language-control": "true",
    "data-code-language": codeBlockLanguageLabel(codeLanguage),
    "data-code-language-label": label,
    "data-code-language-mode": codeLanguage ? "explicit" : "auto",
    "data-code-language-detected": detected ?? "",
    "data-code-language-highlighted": highlightedLanguage ?? "",
    "aria-label": localizedText(
      language,
      `Code block, ${label}`,
      `代码块，${label}`,
    ),
  };

  if (wrapped !== undefined) {
    attributes["data-code-wrap"] = wrapped ? "true" : "false";
  }

  return attributes;
}

function safePosition(getPos: unknown): number | null {
  if (typeof getPos !== "function") return null;
  try {
    const pos = getPos();
    return Number.isSafeInteger(pos) ? pos : null;
  } catch (_error) {
    return null;
  }
}

function lowlightClassName(node: LowlightNode | null | undefined): string {
  const className = node?.properties?.className;
  if (Array.isArray(className)) return className.filter(Boolean).join(" ");
  return typeof className === "string" ? className : "";
}

function flattenedLowlightNodes(
  nodes: readonly LowlightNode[] = [],
  classNames: readonly string[] = [],
): FlattenedLowlightNode[] {
  return (nodes ?? []).flatMap((node) => {
    const nextClassNames = [
      ...classNames,
      ...lowlightClassName(node).split(/\s+/u).filter(Boolean),
    ];
    if (Array.isArray(node?.children)) {
      return flattenedLowlightNodes(node.children, nextClassNames);
    }
    return [{
      text: String(node?.value ?? ""),
      className: nextClassNames.join(" "),
    }];
  });
}

function highlightCodeNodes(source: unknown, language: unknown = null): LowlightNode[] {
  const text = String(source ?? "");
  const normalizedLanguage = codeBlockHighlightLanguage(language);
  if (!text || normalizedLanguage === "plaintext") return [];

  try {
    const highlighted =
      normalizedLanguage && codeBlockLowlight.registered?.(normalizedLanguage)
        ? codeBlockLowlight.highlight(normalizedLanguage, text)
        : codeBlockLowlight.highlightAuto(text);
    return Array.isArray(highlighted?.children) ? highlighted.children as LowlightNode[] : [];
  } catch (_error) {
    return [];
  }
}

export function createCodeHighlightDecorations(
  doc: ProseMirrorNode,
  typeName = "codeBlock",
): DecorationSet {
  const decorations: Decoration[] = [];
  findChildren(doc, (node) => node.type?.name === typeName).forEach((block) => {
    let from = block.pos + 1;
    const language = normalizeCodeBlockLanguage(block.node.attrs?.language);
    flattenedLowlightNodes(highlightCodeNodes(block.node.textContent, language)).forEach((node) => {
      const to = from + node.text.length;
      if (node.className && to > from) {
        decorations.push(Decoration.inline(from, to, { class: node.className }));
      }
      from = to;
    });
  });
  return DecorationSet.create(doc, decorations);
}

function createPapyroCodeHighlightPlugin(typeName = "codeBlock"): Plugin<DecorationSet> {
  const plugin: Plugin<DecorationSet> = new Plugin<DecorationSet>({
    key: new PluginKey(CODE_HIGHLIGHT_PLUGIN_KEY),
    state: {
      init: (_config, state) => createCodeHighlightDecorations(state.doc, typeName),
      apply(transaction, decorationSet: DecorationSet) {
        if (transaction.docChanged) {
          return createCodeHighlightDecorations(transaction.doc, typeName);
        }
        return decorationSet.map(transaction.mapping, transaction.doc);
      },
    },
    props: {
      decorations(state): DecorationSet | undefined {
        return plugin.getState(state);
      },
    },
  });
  return plugin;
}

function languageMenuButton(
  documentRef: PapyroCodeBlockDocument | null | undefined,
  option: PapyroCodeLanguageOption,
  language: unknown,
): PapyroCodeBlockElement | null {
  const button = documentRef?.createElement?.("button") ?? null;
  const title = documentRef?.createElement?.("span") ?? null;
  const description = documentRef?.createElement?.("span") ?? null;
  if (!button) return null;
  const label =
    option.id === "auto"
      ? localizedText(language, "Auto detect", "\u81ea\u52a8\u68c0\u6d4b")
      : codeBlockLanguageUiLabel(language, option.language);
  button.type = "button";
  button.className = "mn-tiptap-code-language-menu-item";
  button.dataset.languageId = option.id;
  button.dataset.languageValue = option.language ?? "";
  button.dataset.languageToken = codeBlockLanguageOptionToken(option);
  button.role = "menuitemradio";
  button.title = label;
  button.setAttribute("aria-label", label);
  if (!title || !description) {
    button.textContent = label;
    return button;
  }
  title.className = "mn-tiptap-code-language-menu-item-title";
  title.textContent = label;
  description.className = "mn-tiptap-code-language-menu-item-description";
  description.textContent = codeLanguageOptionDescription(language, option);
  button.append(title, description);
  return button;
}

function codeLanguageOptionDescription(
  language: unknown,
  option: PapyroCodeLanguageOption,
): string {
  const descriptions: Readonly<Record<string, readonly [string, string]>> = {
    auto: ["Detect from code content", "\u6839\u636e\u4ee3\u7801\u5185\u5bb9\u81ea\u52a8\u8bc6\u522b"],
    plaintext: ["No syntax highlighting", "\u4e0d\u4f7f\u7528\u8bed\u6cd5\u9ad8\u4eae"],
    javascript: ["Browser and Node.js code", "\u6d4f\u89c8\u5668\u4e0e Node.js \u4ee3\u7801"],
    typescript: ["Typed JavaScript", "\u5e26\u7c7b\u578b\u7684 JavaScript"],
    jsx: ["React JavaScript components", "React JavaScript \u7ec4\u4ef6"],
    tsx: ["React TypeScript components", "React TypeScript \u7ec4\u4ef6"],
    rust: ["Rust systems code", "Rust \u7cfb\u7edf\u4ee3\u7801"],
    python: ["Python scripts and notebooks", "Python \u811a\u672c\u4e0e\u7b14\u8bb0\u672c"],
    go: ["Go services and tools", "Go \u670d\u52a1\u4e0e\u5de5\u5177"],
    java: ["Java application code", "Java \u5e94\u7528\u4ee3\u7801"],
    c: ["C source files", "C \u6e90\u6587\u4ef6"],
    cpp: ["C++ source files", "C++ \u6e90\u6587\u4ef6"],
    csharp: ["C# and .NET code", "C# \u4e0e .NET \u4ee3\u7801"],
    json: ["JSON data", "JSON \u6570\u636e"],
    bash: ["Shell scripts", "Shell \u811a\u672c"],
    powershell: ["PowerShell scripts", "PowerShell \u811a\u672c"],
    markdown: ["Markdown source", "Markdown \u6e90\u7801"],
    html: ["HTML and XML markup", "HTML \u4e0e XML \u6807\u8bb0"],
    css: ["CSS stylesheets", "CSS \u6837\u5f0f\u8868"],
    scss: ["Sass stylesheets", "Sass \u6837\u5f0f\u8868"],
    sql: ["Database queries", "\u6570\u636e\u5e93\u67e5\u8be2"],
    yaml: ["YAML configuration", "YAML \u914d\u7f6e"],
    toml: ["TOML configuration", "TOML \u914d\u7f6e"],
    dockerfile: ["Container build files", "\u5bb9\u5668\u6784\u5efa\u6587\u4ef6"],
    diff: ["Patch and diff output", "\u8865\u4e01\u4e0e diff \u8f93\u51fa"],
    ruby: ["Ruby code", "Ruby \u4ee3\u7801"],
    php: ["PHP code", "PHP \u4ee3\u7801"],
    swift: ["Swift code", "Swift \u4ee3\u7801"],
    kotlin: ["Kotlin code", "Kotlin \u4ee3\u7801"],
    dart: ["Dart and Flutter code", "Dart \u4e0e Flutter \u4ee3\u7801"],
    graphql: ["GraphQL schemas and queries", "GraphQL schema \u4e0e\u67e5\u8be2"],
    ini: ["INI configuration", "INI \u914d\u7f6e"],
  };
  const pair = descriptions[option.id];
  return pair ? localizedText(language, pair[0], pair[1]) : String(option.language ?? option.id);
}

function codeLanguageSearchPlaceholder(language: unknown): string {
  return localizedText(language, "Search languages...", "\u641c\u7d22\u8bed\u8a00...");
}

function codeLanguageNoResultsLabel(language: unknown): string {
  return localizedText(language, "No languages found", "\u672a\u627e\u5230\u8bed\u8a00");
}

function languageOptionMatchesQuery(
  option: PapyroCodeLanguageOption,
  language: unknown,
  query: unknown,
): boolean {
  const normalizedQuery = String(query ?? "").trim().toLowerCase();
  if (!normalizedQuery) return true;

  return [
    option.id,
    option.label,
    option.language,
    codeBlockLanguageUiLabel(language, option.language),
    codeBlockLanguageOptionToken(option),
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalizedQuery));
}

async function writeCodeToClipboard(text: unknown): Promise<boolean> {
  const clipboard = globalThis?.navigator?.clipboard;
  if (typeof clipboard?.writeText !== "function") return false;
  await clipboard.writeText(String(text ?? ""));
  return true;
}

export function createPapyroCodeBlockNodeView({
  editor,
  node,
  getPos,
  view = null,
  options = {},
}: PapyroCodeBlockNodeViewInput = {}): PapyroNodeViewRendererResult | null {
  const documentRef = (
    view?.dom?.ownerDocument ??
    safeEditorView(editor)?.dom?.ownerDocument ??
    defaultDocument()
  ) as PapyroCodeBlockDocument | null;
  const windowRef = defaultWindow(documentRef as any) as PapyroCodeBlockWindow | null;
  const pre = documentRef?.createElement?.("pre") ?? null;
  const code = documentRef?.createElement?.("code") ?? null;
  const languageButton = documentRef?.createElement?.("button") ?? null;
  const toolbar = documentRef?.createElement?.("div") ?? null;
  const copyButton = documentRef?.createElement?.("button") ?? null;
  const wrapButton = documentRef?.createElement?.("button") ?? null;
  const menu = documentRef?.createElement?.("div") ?? null;
  const menuHeader = documentRef?.createElement?.("div") ?? null;
  const menuSearch = documentRef?.createElement?.("label") ?? null;
  const menuSearchIcon = documentRef?.createElement?.("span") ?? null;
  const menuSearchInput = documentRef?.createElement?.("input") ?? null;
  const menuList = documentRef?.createElement?.("div") ?? null;
  if (
    !pre ||
    !code ||
    !languageButton ||
    !toolbar ||
    !copyButton ||
    !wrapButton ||
    !menu ||
    !menuHeader ||
    !menuSearch ||
    !menuSearchIcon ||
    !menuSearchInput ||
    !menuList
  ) {
    return null;
  }

  const className = options.HTMLAttributes?.class ?? "mn-tiptap-code-block";
  const languagePrefix = options.languageClassPrefix ?? LANGUAGE_CLASS_PREFIX;
  let currentNode = node;
  let currentLanguage = editorLanguage(editor, view);
  let codePointerHandled = false;
  let copyPointerHandled = false;
  let wrapPointerHandled = false;
  let copyFeedbackTimer: number | null = null;
  let wrapped = false;
  let languageCommands: PapyroCodeBlockLanguageCommand[] = [];
  let selectedLanguageIndex = 0;
  const menuOwnerId = `${CODE_LANGUAGE_MENU_OWNER_ID_PREFIX}-${++codeLanguageMenuSequence}`;

  pre.className = className;
  pre.dataset.hasLanguageControl = "true";
  pre.dataset.codeWrap = "false";
  code.setAttribute("spellcheck", "false");
  languageButton.type = "button";
  languageButton.className = "mn-tiptap-code-language-button";
  languageButton.contentEditable = "false";
  languageButton.draggable = false;
  languageButton.setAttribute("aria-haspopup", "menu");
  languageButton.setAttribute("aria-expanded", "false");
  toolbar.className = "mn-tiptap-code-toolbar";
  toolbar.contentEditable = "false";
  copyButton.type = "button";
  copyButton.className = "mn-tiptap-code-toolbar-button";
  copyButton.dataset.action = "copy";
  copyButton.contentEditable = "false";
  copyButton.draggable = false;
  wrapButton.type = "button";
  wrapButton.className = "mn-tiptap-code-toolbar-button";
  wrapButton.dataset.action = "wrap";
  wrapButton.contentEditable = "false";
  wrapButton.draggable = false;
  wrapButton.setAttribute("aria-pressed", "false");
  toolbar.append(copyButton, wrapButton);

  menu.className = "mn-tiptap-code-language-menu hidden";
  menu.role = "menu";
  menu.id = menuOwnerId;
  menu.tabIndex = -1;
  menuHeader.className = "mn-tiptap-code-language-menu-header";
  menuSearch.className = "mn-tiptap-code-language-search";
  menuSearchIcon.className = "mn-tiptap-code-language-search-icon";
  menuSearchIcon.setAttribute("aria-hidden", "true");
  menuSearchInput.type = "search";
  menuSearchInput.contentEditable = "false";
  menuSearch.append(menuSearchIcon, menuSearchInput);
  menuList.className = "mn-tiptap-code-language-menu-list";
  menu.append(menuHeader, menuSearch, menuList);
  documentRef?.body?.appendChild?.(menu);
  setHidden(menu, true);

  const closeMenu = () => {
    setHidden(menu, true);
    languageButton.setAttribute("aria-expanded", "false");
    dismiss.close();
  };
  const dismiss = createFloatingDismissController({
    document: documentRef,
    window: windowRef,
    contains: (target: unknown) => Boolean(
      menu.contains?.(target) || languageButton.contains?.(target),
    ),
    onDismiss: closeMenu,
  } as any);

  const syncMenu = () => {
    currentLanguage = editorLanguage(editor, view);
    const selected = normalizeCodeBlockLanguage(currentNode?.attrs?.language);
    const query = String(menuSearchInput.value ?? "");
    languageCommands = [];
    menu.setAttribute("aria-label", codeLanguageMenuLabel(currentLanguage));
    menuHeader.textContent = codeLanguageMenuLabel(currentLanguage);
    menuSearchInput.placeholder = codeLanguageSearchPlaceholder(currentLanguage);
    menuSearchInput.setAttribute("aria-label", codeLanguageSearchPlaceholder(currentLanguage));
    menuList.replaceChildren();
    PAPYRO_CODE_LANGUAGE_OPTIONS
      .filter((option) => languageOptionMatchesQuery(option, currentLanguage, query))
      .forEach((option) => {
      const item = languageMenuButton(documentRef, option, currentLanguage);
      if (!item) return;
      let pointerHandled = false;
      const index = languageCommands.length;
      const active =
        normalizeCodeBlockLanguage(option.language) === selected ||
        (!selected && option.id === "auto");
      const run = () => {
        const pos = safePosition(getPos);
        const ok = setCodeBlockLanguage(editor, option.language, pos);
        if (ok) {
          closeMenu();
        }
        return ok;
      };
      languageCommands.push({ id: option.id, run });
      item.id = commandElementId(menuOwnerId, index);
      item.dataset.commandIndex = String(index);
      item.dataset.active = active ? "true" : "false";
      item.setAttribute("aria-checked", String(active));
      item.addEventListener("mouseenter", () => {
        selectedLanguageIndex = index;
        syncMenuActiveDescendant(menu, menuOwnerId, languageCommands, selectedLanguageIndex, {
          activeClass: "keyboard-active",
          manageTabIndex: true,
          scroll: false,
        });
      });
      item.addEventListener("pointerdown", (event: Event) => {
        event.preventDefault();
        event.stopPropagation?.();
        pointerHandled = run();
      });
      item.addEventListener("click", (event: Event) => {
        event.preventDefault();
        event.stopPropagation?.();
        if (!pointerHandled) {
          run();
        }
        pointerHandled = false;
      });
      menuList.appendChild(item);
    });
    const customLanguage = normalizeCodeBlockLanguage(currentNode?.attrs?.language);
    if (
      customLanguage &&
      !codeBlockLanguageOption(customLanguage) &&
      languageOptionMatchesQuery(
        {
          id: customLanguage,
          label: customLanguage,
          language: customLanguage,
        },
        currentLanguage,
        query,
      )
    ) {
      const item = languageMenuButton(
        documentRef,
        {
          id: customLanguage,
          label: customLanguage,
          language: customLanguage,
        },
        currentLanguage,
      );
      if (item) {
        const index = languageCommands.length;
        languageCommands.push({ id: customLanguage, run: () => false });
        item.id = commandElementId(menuOwnerId, index);
        item.dataset.commandIndex = String(index);
        item.dataset.active = "true";
        item.setAttribute("aria-checked", "true");
        item.disabled = true;
        item.title = localizedText(
          currentLanguage,
          "Custom language detected from Markdown",
          "从 Markdown 检测到的自定义语言",
        );
        menuList.appendChild(item);
      }
    }
    if (languageCommands.length === 0) {
      const empty = documentRef?.createElement?.("div");
      if (empty) {
        empty.className = "mn-tiptap-code-language-menu-empty";
        empty.role = "status";
        empty.textContent = codeLanguageNoResultsLabel(currentLanguage);
        menuList.appendChild(empty);
      }
    }
    selectedLanguageIndex = Math.max(
      0,
      languageCommands.findIndex((command) => command.id === (codeBlockLanguageOption(selected)?.id ?? selected ?? "auto")),
    );
    if (selectedLanguageIndex < 0) selectedLanguageIndex = 0;
    syncMenuActiveDescendant(menu, menuOwnerId, languageCommands, selectedLanguageIndex, {
      activeClass: "keyboard-active",
      manageTabIndex: true,
      scroll: false,
    });
  };

  const openMenu = () => {
    syncMenu();
    setHidden(menu, false);
    languageButton.setAttribute("aria-expanded", "true");
    positionFloatingElement(menu, languageButton.getBoundingClientRect?.(), {
      viewport: viewportSize(pre, windowRef as any),
      size: {
        width: LANGUAGE_MENU_WIDTH,
        height: LANGUAGE_MENU_HEIGHT,
        margin: 10,
      },
      placement: "bottom",
    });
    dismiss.open();
    menuSearchInput.focus?.({ preventScroll: true });
    return true;
  };

  let buttonPointerHandled = false;
  const toggleMenu = () => {
    if (menu.hidden) {
      return openMenu();
    }
    closeMenu();
    return true;
  };

  const clearCopyFeedback = () => {
    if (copyFeedbackTimer && typeof windowRef?.clearTimeout === "function") {
      windowRef.clearTimeout(copyFeedbackTimer);
    }
    copyFeedbackTimer = null;
    copyButton.dataset.state = "idle";
    copyButton.setAttribute("aria-label", codeBlockCopyLabel(currentLanguage));
    copyButton.title = codeBlockCopyLabel(currentLanguage);
  };
  const scheduleCopyFeedbackClear = () => {
    if (typeof windowRef?.setTimeout !== "function") return;
    if (copyFeedbackTimer && typeof windowRef.clearTimeout === "function") {
      windowRef.clearTimeout(copyFeedbackTimer);
    }
    copyFeedbackTimer = windowRef.setTimeout(clearCopyFeedback, COPY_FEEDBACK_MS);
  };
  const runCopy = async () => {
    const ok = await writeCodeToClipboard(currentNode?.textContent ?? code.textContent ?? "");
    const label = ok ? codeBlockCopiedLabel(currentLanguage) : codeBlockCopyFailedLabel(currentLanguage);
    copyButton.dataset.state = ok ? "copied" : "failed";
    copyButton.setAttribute("aria-label", label);
    copyButton.title = label;
    scheduleCopyFeedbackClear();
    return ok;
  };
  const toggleWrap = () => {
    wrapped = !wrapped;
    pre.dataset.codeWrap = wrapped ? "true" : "false";
    wrapButton.setAttribute("aria-pressed", String(wrapped));
    const label = codeBlockWrapLabel(currentLanguage, wrapped);
    wrapButton.setAttribute("aria-label", label);
    wrapButton.title = label;
    return true;
  };
  copyButton.addEventListener("pointerdown", (event: Event) => {
    event.preventDefault();
    event.stopPropagation?.();
    copyPointerHandled = true;
    return runCopy();
  });
  copyButton.addEventListener("click", (event: Event) => {
    event.preventDefault();
    event.stopPropagation?.();
    if (!copyPointerHandled) {
      return runCopy();
    }
    copyPointerHandled = false;
    return true;
  });
  wrapButton.addEventListener("pointerdown", (event: Event) => {
    event.preventDefault();
    event.stopPropagation?.();
    wrapPointerHandled = toggleWrap();
    return wrapPointerHandled;
  });
  wrapButton.addEventListener("click", (event: Event) => {
    event.preventDefault();
    event.stopPropagation?.();
    if (!wrapPointerHandled) {
      return toggleWrap();
    }
    wrapPointerHandled = false;
    return true;
  });
  languageButton.addEventListener("pointerdown", (event: Event) => {
    event.preventDefault();
    event.stopPropagation?.();
    buttonPointerHandled = toggleMenu();
  });
  languageButton.addEventListener("click", (event: Event) => {
    event.preventDefault();
    event.stopPropagation?.();
    if (!buttonPointerHandled) {
      toggleMenu();
    }
    buttonPointerHandled = false;
  });
  languageButton.addEventListener("keydown", (event: KeyboardEvent) => {
    if (isComposingKeyboardEvent(event)) return;
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation?.();
      if (menu.hidden) openMenu();
    }
  });

  menuSearchInput.addEventListener("input", () => {
    selectedLanguageIndex = 0;
    syncMenu();
  });

  menuSearchInput.addEventListener("keydown", (event: KeyboardEvent) => {
    if (isComposingKeyboardEvent(event)) return;
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    event.stopPropagation?.();
    if (!languageCommands.length) return;
    const direction = event.key === "ArrowDown" ? 1 : -1;
    selectedLanguageIndex =
      (selectedLanguageIndex + direction + languageCommands.length) % languageCommands.length;
    syncMenuActiveDescendant(menu, menuOwnerId, languageCommands, selectedLanguageIndex, {
      activeClass: "keyboard-active",
      manageTabIndex: true,
    });
  });

  menu.addEventListener("keydown", (event: KeyboardEvent) => {
    if (isComposingKeyboardEvent(event)) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation?.();
      closeMenu();
      languageButton.focus?.({ preventScroll: true });
      return;
    }

    if (!languageCommands.length) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation?.();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      selectedLanguageIndex =
        (selectedLanguageIndex + direction + languageCommands.length) % languageCommands.length;
      syncMenuActiveDescendant(menu, menuOwnerId, languageCommands, selectedLanguageIndex, {
        activeClass: "keyboard-active",
        manageTabIndex: true,
      });
      return;
    }

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      event.stopPropagation?.();
      selectedLanguageIndex = event.key === "Home" ? 0 : languageCommands.length - 1;
      syncMenuActiveDescendant(menu, menuOwnerId, languageCommands, selectedLanguageIndex, {
        activeClass: "keyboard-active",
        manageTabIndex: true,
      });
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation?.();
      languageCommands[selectedLanguageIndex]?.run?.();
    }
  });

  code.addEventListener("pointerdown", (event: PointerEvent) => {
    const x = Number(event?.clientX);
    const y = Number(event?.clientY);
    const rect = languageButton.getBoundingClientRect?.();
    const nearLanguageControl =
      rect &&
      Number.isFinite(x) &&
      Number.isFinite(y) &&
      y >= rect.top - 8 &&
      y <= rect.bottom + 8 &&
      x >= rect.left - 12 &&
      x <= rect.right + 12;
    if (!nearLanguageControl) {
      codePointerHandled = false;
      return;
    }

    event.preventDefault();
    event.stopPropagation?.();
    codePointerHandled = toggleMenu();
  });

  code.addEventListener("click", (event: Event) => {
    if (!codePointerHandled) return;
    event.preventDefault();
    event.stopPropagation?.();
    codePointerHandled = false;
  });

  function sync(nextNode: PapyroCodeBlockNode | null | undefined = currentNode) {
    const preRef = pre as PapyroCodeBlockElement;
    const codeRef = code as PapyroCodeBlockElement;
    const languageButtonRef = languageButton as PapyroCodeBlockElement;
    const copyButtonRef = copyButton as PapyroCodeBlockElement;
    const wrapButtonRef = wrapButton as PapyroCodeBlockElement;
    currentNode = nextNode;
    currentLanguage = editorLanguage(editor, view);
    const language = normalizeCodeBlockLanguage(currentNode?.attrs?.language);
    const detectedLanguage = language ? null : inferCodeBlockLanguage(currentNode?.textContent);
    const label = codeBlockLanguageDisplayLabel(currentLanguage, language, detectedLanguage);
    preRef.dataset.codeLanguage = codeBlockLanguageLabel(language);
    preRef.dataset.codeLanguageLabel = label;
    preRef.dataset.codeLanguageMode = language ? "explicit" : "auto";
    preRef.dataset.codeLanguageDetected = detectedLanguage ?? "";
    preRef.setAttribute(
      "aria-label",
      localizedText(
        currentLanguage,
        `Code block, ${label}`,
        `代码块，${label}`,
      ),
    );
    const highlightedLanguage = lowlightLanguageName(language ?? detectedLanguage);
    const displayLanguage = highlightedDisplayLanguage(highlightedLanguage);
    preRef.dataset.codeLanguageHighlighted = displayLanguage ?? "";
    codeRef.className = [
      languageClassName(language ?? detectedLanguage, languagePrefix),
      displayLanguage ? `hljs language-${displayLanguage}` : "hljs",
    ]
      .filter(Boolean)
      .join(" ");
    languageButtonRef.textContent = label;
    languageButtonRef.dataset.languageBadge = codeBlockLanguageOptionToken(language ?? detectedLanguage ?? null);
    languageButtonRef.dataset.languageValue = language ?? detectedLanguage ?? "auto";
    languageButtonRef.dataset.languageMode = language ? "explicit" : "auto";
    languageButtonRef.dataset.languageDetected = detectedLanguage ?? "";
    languageButtonRef.title = codeLanguageButtonAriaLabel(currentLanguage);
    languageButtonRef.setAttribute("aria-label", `${codeLanguageButtonAriaLabel(currentLanguage)}: ${label}`);
    if (copyButtonRef.dataset.state !== "copied" && copyButtonRef.dataset.state !== "failed") {
      copyButtonRef.dataset.state = "idle";
      copyButtonRef.setAttribute("aria-label", codeBlockCopyLabel(currentLanguage));
      copyButtonRef.title = codeBlockCopyLabel(currentLanguage);
    }
    wrapButtonRef.setAttribute("aria-label", codeBlockWrapLabel(currentLanguage, wrapped));
    wrapButtonRef.title = codeBlockWrapLabel(currentLanguage, wrapped);
  }

  sync(node);
  pre.append(languageButton, toolbar, code);

  return {
    dom: pre,
    contentDOM: code,
    update(nextNode: ProseMirrorNode) {
      if (nodeTypeName(nextNode) !== nodeTypeName(currentNode)) return false;
      sync(nextNode);
      if (!menu.hidden) syncMenu();
      return true;
    },
    destroy() {
      if (copyFeedbackTimer && typeof windowRef?.clearTimeout === "function") {
        windowRef.clearTimeout(copyFeedbackTimer);
      }
      dismiss.close();
      menu.remove?.();
    },
  } as unknown as PapyroNodeViewRendererResult;
}

function nodeTypeName(node: PapyroCodeBlockNode | null | undefined): string {
  const type = node?.type;
  return typeof type === "string" ? type : type?.name ?? "";
}

function selectedCodeBlockPosition(
  state: PapyroCodeBlockState | null | undefined,
  typeName: string,
  explicitPos: number | null = null,
): { pos: number; node: PapyroCodeBlockNode } | null {
  if (Number.isSafeInteger(explicitPos)) {
    const pos = explicitPos as number;
    const node = state?.doc?.nodeAt?.(pos);
    return nodeTypeName(node) === typeName && node ? { pos, node } : null;
  }

  const selection = state?.selection;
  const $from = selection?.$from;
  if (!$from) return null;

  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    const node = $from.node(depth);
    if (nodeTypeName(node) === typeName && node) {
      return {
        pos: depth === 0 ? 0 : $from.before(depth),
        node,
      };
    }
  }

  const from = Number.isSafeInteger(selection.from) ? selection.from as number : 0;
  const node = state?.doc?.nodeAt?.(from);
  return nodeTypeName(node) === typeName && node ? { pos: from, node } : null;
}

export function setCodeBlockLanguage(
  editor: PapyroCodeBlockEditor | null | undefined,
  language: unknown,
  pos: number | null = null,
): boolean {
  const state = editor?.state;
  const match = selectedCodeBlockPosition(state, "codeBlock", pos);
  const view = safeEditorView(editor);
  if (!state?.tr || !match || typeof view?.dispatch !== "function") {
    return false;
  }

  const nextLanguage = normalizeCodeBlockLanguage(language);
  const tr = state.tr.setNodeMarkup(match.pos, undefined, {
    ...match.node.attrs,
    language: nextLanguage,
  });
  view.dispatch(tr);
  editor?.commands?.focus?.();
  return true;
}

export function createPapyroCodeBlockOptions() {
  return {
    defaultLanguage: DEFAULT_CODE_LANGUAGE,
    enableTabIndentation: true,
    tabSize: DEFAULT_TAB_SIZE,
    lowlight: codeBlockLowlight,
    languageClassPrefix: LANGUAGE_CLASS_PREFIX,
    HTMLAttributes: {
      class: "mn-tiptap-code-block",
    },
  };
}

export type PapyroCodeBlockNodeViewRendererFactory = (context: {
  options: PapyroCodeBlockNodeViewOptions;
  fallbackNodeView: NodeViewRenderer;
}) => NodeViewRenderer;

function createFallbackCodeBlockNodeView(
  options: PapyroCodeBlockNodeViewOptions,
): NodeViewRenderer {
  return (({ editor, node, getPos, view }: NodeViewRendererProps) =>
    createPapyroCodeBlockNodeView({
      editor: editor as PapyroCodeBlockEditor,
      node,
      getPos,
      view: { dom: view.dom as PapyroCodeBlockElement },
      options,
    }) as PapyroNodeViewRendererResult) as NodeViewRenderer;
}

export function createPapyroCodeBlockExtension({
  nodeViewRenderer = null,
}: {
  nodeViewRenderer?: PapyroCodeBlockNodeViewRendererFactory | null;
} = {}) {
  return CodeBlockLowlight.extend({
    addNodeView() {
      const nodeViewOptions = this.options as unknown as PapyroCodeBlockNodeViewOptions;
      const fallbackNodeView = createFallbackCodeBlockNodeView(nodeViewOptions);
      if (typeof nodeViewRenderer === "function") {
        return nodeViewRenderer({
          options: nodeViewOptions,
          fallbackNodeView,
        });
      }

      return fallbackNodeView;
    },

    renderHTML({ node, HTMLAttributes }) {
      const language = normalizeCodeBlockLanguage(node.attrs.language);
      const detectedLanguage = language ? null : inferCodeBlockLanguage(node.textContent);
      const highlightedLanguage = lowlightLanguageName(language ?? detectedLanguage);
      const displayLanguage = highlightedDisplayLanguage(highlightedLanguage);
      return [
        "pre",
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
          "data-code-language": codeBlockLanguageLabel(language),
          "data-code-language-label": codeBlockLanguageDisplayLabel(
            "english",
            language,
            detectedLanguage,
          ),
          "data-code-language-mode": language ? "explicit" : "auto",
          "data-code-language-detected": detectedLanguage ?? "",
          "data-code-language-highlighted": displayLanguage ?? "",
        }),
        [
          "code",
          {
            class: [
              displayLanguage ? this.options.languageClassPrefix + displayLanguage : null,
              displayLanguage ? `hljs language-${displayLanguage}` : "hljs",
            ]
              .filter(Boolean)
              .join(" "),
          },
          0,
        ],
      ];
    },

    addProseMirrorPlugins() {
      return [
        ...(this.parent?.() ?? []),
        createPapyroCodeHighlightPlugin(this.name),
      ];
    },

    addCommands() {
      return {
        ...this.parent?.(),
        setCodeBlockLanguage:
          (language: unknown, pos: number | null = null) =>
          ({ editor }: { editor: Editor }) =>
          setCodeBlockLanguage(editor as PapyroCodeBlockEditor, language, pos),
      };
    },
  });
}

export const PapyroCodeBlock = createPapyroCodeBlockExtension();

export function createPapyroCodeBlockExtensions(options: {
  nodeViewRenderer?: PapyroCodeBlockNodeViewRendererFactory | null;
} = {}) {
  return [
    createPapyroCodeBlockExtension(options).configure(createPapyroCodeBlockOptions()),
  ];
}
