const DEFAULT_CODE_LANGUAGE = null;
const DEFAULT_TAB_SIZE = 2;

export function normalizeCodeBlockLanguage(language) {
  const normalized = String(language ?? "").trim().toLowerCase();
  if (!normalized) return null;
  if (!/^[a-z0-9_+.-]{1,48}$/u.test(normalized)) return null;
  return normalized;
}

export function createPapyroCodeBlockOptions() {
  return {
    defaultLanguage: DEFAULT_CODE_LANGUAGE,
    enableTabIndentation: true,
    tabSize: DEFAULT_TAB_SIZE,
    languageClassPrefix: "language-",
    HTMLAttributes: {
      class: "mn-tiptap-code-block",
    },
  };
}
