import React from "react";
import { createRoot, type Root } from "react-dom/client";

import { PapyroTiptapReactIsland } from "./island.tsx";

function noop() {}

type TiptapReactComponentOverrides = Record<string, unknown>;

type TiptapReactRuntimeEntry = Record<string, unknown> | null;

type TiptapEditorLike = {
  mount?: (root: Element | null) => unknown;
};

type TiptapReactIslandProps = {
  editor: TiptapEditorLike;
  entry?: TiptapReactRuntimeEntry;
  components?: TiptapReactComponentOverrides;
};

type CreateTiptapReactRoot = (container: Element | DocumentFragment) => Pick<Root, "render" | "unmount">;

type CreateTiptapReactMountControllerOptions = {
  createRootImpl?: CreateTiptapReactRoot;
  document?: Document | null;
  components?: TiptapReactComponentOverrides;
  IslandComponent?: React.ComponentType<TiptapReactIslandProps>;
};

type CreateEditorElementOptions = {
  root?: Element | null;
};

type TiptapReactMountOptions = {
  root?: Element | null;
  editor?: TiptapEditorLike | null;
  entry?: TiptapReactRuntimeEntry;
};

const DefaultIslandComponent =
  PapyroTiptapReactIsland as React.ComponentType<TiptapReactIslandProps>;

export function createTiptapReactMountController({
  createRootImpl = createRoot,
  document: documentRef = typeof document === "undefined" ? null : document,
  components = {},
  IslandComponent = DefaultIslandComponent,
}: CreateTiptapReactMountControllerOptions = {}) {
  return {
    createEditorElement({ root }: CreateEditorElementOptions = {}) {
      const ownerDocument = documentRef ?? root?.ownerDocument ?? null;
      const element = ownerDocument?.createElement?.("div") ?? null;
      if (element) {
        element.className = "mn-tiptap-react-seed";
      }
      return element;
    },

    mount({ root, editor, entry = null }: TiptapReactMountOptions = {}) {
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
      const render = (nextEntry = entry) => {
        reactRoot.render(
          <IslandComponent
            editor={editor}
            entry={nextEntry}
            components={components}
          />,
        );
      };

      render(entry);

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
    mount({ root, editor }: TiptapReactMountOptions = {}) {
      editor?.mount?.(root ?? null);
      return {
        refresh: noop,
        destroy: noop,
      };
    },
  };
}
