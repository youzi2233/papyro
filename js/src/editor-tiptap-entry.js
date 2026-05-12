import { createEditorRuntimeRegistry } from "./editor-registry.js";
import { createEditorHostRuntime } from "./editor-host-runtime.js";
import { installPapyroEditorRuntime } from "./editor-runtime-bootstrap.js";
import { createPapyroTiptapExtensions } from "./tiptap-markdown.js";
import {
  createTiptapReactCodeBlockNodeViewRenderer,
  createTiptapReactLinkEditorView,
  createTiptapReactMountController,
} from "./tiptap-react/index.js";
import { createTiptapTableCommandBridge } from "./tiptap-table-command-bridge.js";
import { createTiptapEditorRuntime } from "./tiptap-runtime.js";

const editorRegistry = createEditorRuntimeRegistry();
const hostRuntime = createEditorHostRuntime({ registry: editorRegistry });
const createRuntimeExtensions = () =>
  createPapyroTiptapExtensions({
    codeBlockNodeViewRenderer: createTiptapReactCodeBlockNodeViewRenderer(),
  });
const tiptapRuntimeAdapter = createTiptapEditorRuntime({
  registry: editorRegistry,
  extensionsFactory: createRuntimeExtensions,
  layout: {
    attachEditorScroll: hostRuntime.attachEditorScroll,
    detachEditorScroll: hostRuntime.detachEditorScroll,
    attachLayoutObserver: hostRuntime.attachLayoutObserver,
    detachLayoutObserver: hostRuntime.detachLayoutObserver,
    restoreEditorScrollSnapshot: hostRuntime.restoreEditorScrollSnapshot,
  },
  formatToolbarControllerFactory: () => ({
    attach() {},
    refresh() {},
    close() {},
    contains() { return false; },
    destroy() {},
  }),
  formatToolbarViewFactory: null,
  blockHandleControllerFactory: () => ({
    attach() {},
    refresh() {},
    close() {},
    contains() { return false; },
    handleKeyDown() { return false; },
    destroy() {},
  }),
  blockHandleViewFactory: null,
  blockActionMenuControllerFactory: () => ({
    attach() {},
    refresh() {},
    close() {},
    contains() { return false; },
    shouldKeepOpenOnEditorBlur() { return false; },
    destroy() {},
  }),
  blockActionMenuViewFactory: null,
  linkEditorViewFactory: createTiptapReactLinkEditorView,
  mountControllerFactory: createTiptapReactMountController,
  slashMenuViewFactory: null,
  tableToolbarControllerFactory: createTiptapTableCommandBridge,
  navigation: hostRuntime.navigation,
});

installPapyroEditorRuntime(window, {
  adapters: {
    tiptap: tiptapRuntimeAdapter,
  },
});
