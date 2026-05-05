export const DEFAULT_EDITOR_RUNTIME_KIND = "tiptap";
export const FALLBACK_EDITOR_RUNTIME_KIND = "codemirror";

const SUPPORTED_EDITOR_RUNTIME_KINDS = Object.freeze([
  FALLBACK_EDITOR_RUNTIME_KIND,
  DEFAULT_EDITOR_RUNTIME_KIND,
]);

export function normalizeEditorRuntimeKind(kind) {
  if (SUPPORTED_EDITOR_RUNTIME_KINDS.includes(kind)) return kind;
  return DEFAULT_EDITOR_RUNTIME_KIND;
}

export function selectEditorRuntimeAdapter({ requestedKind, adapters }) {
  const runtimeAdapters = adapters ?? {};
  const normalizedKind = normalizeEditorRuntimeKind(requestedKind);
  const candidates = [
    normalizedKind,
    DEFAULT_EDITOR_RUNTIME_KIND,
    FALLBACK_EDITOR_RUNTIME_KIND,
  ];

  for (const candidate of candidates) {
    if (runtimeAdapters[candidate]) return runtimeAdapters[candidate];
  }

  return null;
}
