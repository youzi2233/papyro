export function isRuntimeEditorDestroyed(editor) {
  if (!editor) return false;

  try {
    return editor.isDestroyed === true || editor.destroyed === true;
  } catch {
    return false;
  }
}

export class EditorRuntimeRegistry {
  #entries;

  constructor(entries = new Map()) {
    this.#entries = entries;
  }

  get size() {
    return this.#entries.size;
  }

  get(tabId) {
    return this.#entries.get(tabId);
  }

  has(tabId) {
    return this.#entries.has(tabId);
  }

  set(tabId, entry) {
    this.#entries.set(tabId, entry);
    return this;
  }

  delete(tabId) {
    return this.#entries.delete(tabId);
  }

  clear() {
    this.#entries.clear();
  }

  entries() {
    return this.#entries.entries();
  }

  keys() {
    return this.#entries.keys();
  }

  values() {
    return this.#entries.values();
  }

  [Symbol.iterator]() {
    return this.entries();
  }

  register(tabId, entry) {
    this.set(tabId, entry);
    return entry;
  }

  currentEntry(tabId, { entry, editor } = {}) {
    const current = this.get(tabId) ?? null;
    if (!current) return null;
    if (entry && current !== entry) return null;
    if (editor && current.editor !== editor) return null;
    if (isRuntimeEditorDestroyed(current.editor)) return null;
    return current;
  }

  entryForEditor(tabId, editor) {
    return this.currentEntry(tabId, { editor });
  }

  isCurrentEntry(tabId, entry) {
    return this.currentEntry(tabId, { entry }) === entry;
  }

  isCurrentEditor(tabId, editor) {
    return this.entryForEditor(tabId, editor) !== null;
  }

  unregister(tabId, expectedEntry = null) {
    const entry = this.get(tabId) ?? null;
    if (!entry) return null;
    if (expectedEntry && entry !== expectedEntry) return null;

    this.delete(tabId);
    return entry;
  }

  release(tabId, disposeEntry) {
    const entry = this.unregister(tabId);
    if (!entry) return null;

    if (typeof disposeEntry === "function") {
      disposeEntry(entry);
    }
    return entry;
  }
}

export function createEditorRuntimeRegistry(entries) {
  return new EditorRuntimeRegistry(entries);
}
