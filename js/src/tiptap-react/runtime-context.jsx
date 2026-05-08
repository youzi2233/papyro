import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";

import {
  createPapyroTiptapRuntimeModel,
  createPapyroTiptapSelectionSnapshot,
  normalizePapyroTiptapLanguage,
  normalizePapyroTiptapViewMode,
  samePapyroTiptapSelectionSnapshot,
} from "./runtime-model.js";

export {
  createPapyroTiptapCommandExecutor,
  createPapyroTiptapRuntimeModel,
  createPapyroTiptapSelectionSnapshot,
  normalizePapyroTiptapLanguage,
  normalizePapyroTiptapViewMode,
  samePapyroTiptapSelectionSnapshot,
} from "./runtime-model.js";

const PapyroTiptapRuntimeContext = createContext(null);

function createEditorSelectionStore(editor) {
  let lastSnapshot = createPapyroTiptapSelectionSnapshot(editor);
  const subscribers = new Set();

  const notify = () => {
    const nextSnapshot = createPapyroTiptapSelectionSnapshot(editor);
    if (samePapyroTiptapSelectionSnapshot(lastSnapshot, nextSnapshot)) {
      return;
    }
    lastSnapshot = nextSnapshot;
    subscribers.forEach((callback) => callback());
  };

  return {
    getSnapshot() {
      return lastSnapshot;
    },
    getServerSnapshot() {
      return createPapyroTiptapSelectionSnapshot(null);
    },
    notify,
    subscribe(callback) {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    },
  };
}

export function usePapyroTiptapSelectionSnapshot(editor) {
  const storeRef = useRef(null);
  if (!storeRef.current || storeRef.current.editor !== editor) {
    storeRef.current = {
      editor,
      store: createEditorSelectionStore(editor),
    };
  }

  const store = storeRef.current.store;

  useEffect(() => {
    if (!editor || typeof editor.on !== "function") {
      store.notify();
      return undefined;
    }

    const notify = () => {
      store.notify();
    };

    editor.on("transaction", notify);
    editor.on("selectionUpdate", notify);
    notify();

    return () => {
      editor.off?.("transaction", notify);
      editor.off?.("selectionUpdate", notify);
    };
  }, [editor, store]);

  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
}

export function PapyroTiptapRuntimeProvider({
  editor,
  entry = null,
  children,
}) {
  const selection = usePapyroTiptapSelectionSnapshot(editor);
  const value = useMemo(
    () => createPapyroTiptapRuntimeModel({ editor, entry, selection }),
    [
      editor,
      entry,
      entry?.dioxus,
      entry?.preferences,
      entry?.preferences?.language,
      entry?.viewMode,
      selection,
    ],
  );

  return (
    <PapyroTiptapRuntimeContext.Provider value={value}>
      {children}
    </PapyroTiptapRuntimeContext.Provider>
  );
}

export function usePapyroTiptapRuntime() {
  const context = useContext(PapyroTiptapRuntimeContext);
  if (!context) {
    throw new Error(
      "usePapyroTiptapRuntime must be used inside PapyroTiptapRuntimeProvider",
    );
  }
  return context;
}

export function usePapyroTiptapLanguage() {
  return usePapyroTiptapRuntime().language;
}

export function usePapyroTiptapViewMode() {
  return usePapyroTiptapRuntime().viewMode;
}

export function usePapyroTiptapPreferences() {
  return usePapyroTiptapRuntime().preferences;
}

export function usePapyroTiptapSelection() {
  return usePapyroTiptapRuntime().selection;
}

export function usePapyroTiptapCommandExecutor() {
  return usePapyroTiptapRuntime().commands;
}
