import React from "react";
import { createRoot } from "react-dom/client";
import { Tiptap } from "@tiptap/react";

function noop() {}

function renderIslandSlot(SlotComponent, editor) {
  if (!SlotComponent) return null;
  if (React.isValidElement(SlotComponent)) return SlotComponent;
  if (typeof SlotComponent === "function") {
    return <SlotComponent editor={editor} />;
  }
  return null;
}

export function PapyroTiptapEditorContent({
  className = "mn-tiptap-react-content",
} = {}) {
  return <Tiptap.Content className={className} />;
}

export function createPapyroTiptapReactComponents(components = {}) {
  return {
    BeforeContent: null,
    EditorContent: PapyroTiptapEditorContent,
    AfterContent: null,
    OverlayLayer: null,
    ...components,
  };
}

export function PapyroTiptapReactIsland({ editor, components = {} }) {
  if (!editor) {
    return (
      <div
        className="mn-tiptap-react-loading"
        role="status"
        aria-label="Loading editor"
      />
    );
  }

  const {
    BeforeContent,
    AfterContent,
    OverlayLayer,
    EditorContent: EditorContentComponent,
  } = createPapyroTiptapReactComponents(components);
  const EditorContent = EditorContentComponent ?? PapyroTiptapEditorContent;

  return (
    <Tiptap editor={editor}>
      {renderIslandSlot(BeforeContent, editor)}
      <EditorContent editor={editor} />
      {renderIslandSlot(AfterContent, editor)}
      {renderIslandSlot(OverlayLayer, editor)}
    </Tiptap>
  );
}

export function createTiptapReactMountController({
  createRootImpl = createRoot,
  document: documentRef = typeof document === "undefined" ? null : document,
  components = {},
  IslandComponent = PapyroTiptapReactIsland,
} = {}) {
  return {
    createEditorElement({ root } = {}) {
      const ownerDocument = documentRef ?? root?.ownerDocument ?? null;
      const element = ownerDocument?.createElement?.("div") ?? null;
      if (element) {
        element.className = "mn-tiptap-react-seed";
      }
      return element;
    },

    mount({ root, editor } = {}) {
      if (!root || !editor) {
        throw new Error("React Tiptap mount requires a root element and editor");
      }

      const ownerDocument = documentRef ?? root.ownerDocument ?? null;
      const reactHost = ownerDocument?.createElement?.("div") ?? null;
      if (!reactHost) {
        throw new Error("Unable to create React Tiptap host");
      }

      reactHost.className = "mn-tiptap-react-root";
      root.appendChild?.(reactHost);

      const reactRoot = createRootImpl(reactHost);
      const render = () => {
        reactRoot.render(
          <IslandComponent editor={editor} components={components} />,
        );
      };

      render();

      return {
        refresh: render,
        destroy() {
          reactRoot.unmount?.();
          reactHost.remove?.();
        },
      };
    },
  };
}

export function createTiptapLegacyMountController() {
  return {
    createEditorElement: () => null,
    mount({ root, editor } = {}) {
      editor?.mount?.(root);
      return {
        refresh: noop,
        destroy: noop,
      };
    },
  };
}
