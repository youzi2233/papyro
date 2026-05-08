import React, { createContext, useContext, useMemo } from "react";

import {
  createPapyroTiptapRuntimeModel,
  normalizePapyroTiptapLanguage,
  normalizePapyroTiptapViewMode,
} from "./runtime-model.js";

export {
  createPapyroTiptapCommandExecutor,
  createPapyroTiptapRuntimeModel,
  createPapyroTiptapSelectionSnapshot,
  normalizePapyroTiptapLanguage,
  normalizePapyroTiptapViewMode,
} from "./runtime-model.js";

const PapyroTiptapRuntimeContext = createContext(null);

export function PapyroTiptapRuntimeProvider({
  editor,
  entry = null,
  children,
}) {
  const value = useMemo(
    () => createPapyroTiptapRuntimeModel({ editor, entry }),
    [
      editor,
      entry,
      entry?.dioxus,
      entry?.preferences,
      entry?.preferences?.language,
      entry?.viewMode,
      editor?.state?.selection,
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
