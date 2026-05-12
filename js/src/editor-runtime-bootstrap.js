import {
  assertPapyroEditorFacade,
  createPapyroEditorFacade,
} from "./editor-runtime-contract.ts";
import { selectEditorRuntimeAdapter } from "./editor-runtime-selector.js";

export function createEditorRuntimeFacade({
  requestedKind,
  adapters,
  selectRuntimeAdapter = selectEditorRuntimeAdapter,
  createFacade = createPapyroEditorFacade,
} = {}) {
  const runtimeAdapter = selectRuntimeAdapter({ requestedKind, adapters });
  if (!runtimeAdapter) {
    throw new TypeError("No Papyro editor runtime adapter is available");
  }

  return assertPapyroEditorFacade(createFacade(runtimeAdapter));
}

function definePapyroEditorFacade(target, facade) {
  Object.defineProperty(target, "papyroEditor", {
    configurable: false,
    enumerable: true,
    writable: false,
    value: facade,
  });
}

export function installPapyroEditorRuntime(
  target,
  { adapters, requestedKind = target?.PAPYRO_EDITOR_RUNTIME, createFacade } = {},
) {
  if (!target || typeof target !== "object") {
    throw new TypeError("Papyro editor runtime requires a host object");
  }
  if (target.papyroEditor) {
    return assertPapyroEditorFacade(target.papyroEditor);
  }

  const facade = createEditorRuntimeFacade({
    requestedKind,
    adapters,
    createFacade,
  });
  definePapyroEditorFacade(target, facade);
  return facade;
}
