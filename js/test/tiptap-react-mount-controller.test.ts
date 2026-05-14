import test from "node:test";
import assert from "node:assert/strict";

import {
  createTiptapLegacyMountController,
  createTiptapReactMountController,
} from "../src/tiptap-react/mount-controller.tsx";

function createElement(tagName: string) {
  return {
    tagName,
    className: "",
    ownerDocument: null as ReturnType<typeof createDocument> | null,
    parentElement: null as ReturnType<typeof createRoot> | null,
    removed: false,
    remove() {
      this.removed = true;
      if (this.parentElement) {
        this.parentElement.children = this.parentElement.children.filter(
          (child) => child !== this,
        );
        this.parentElement = null;
      }
    },
  };
}

function createDocument() {
  return {
    createElement(tagName: string) {
      const element = createElement(tagName);
      element.ownerDocument = this;
      return element;
    },
  };
}

function createRoot(documentRef = createDocument()) {
  return {
    ownerDocument: documentRef,
    children: [] as Array<ReturnType<typeof createElement>>,
    appendChild(child: ReturnType<typeof createElement>) {
      this.children.push(child);
      child.parentElement = this;
    },
  };
}

test("Tiptap React mount controller owns the React host lifecycle", () => {
  const rendered: Array<unknown> = [];
  const unmounts: Array<boolean> = [];
  const createdRoots: Array<unknown> = [];
  const documentRef = createDocument();
  const root = createRoot(documentRef);
  const editor = { id: "editor-a" };
  const components = { OverlayLayer: () => null };
  const entry = { viewMode: "hybrid" };
  const nextEntry = { viewMode: "source" };
  const IslandComponent = () => null;
  const controller = createTiptapReactMountController({
    document: documentRef as unknown as Document,
    components,
    IslandComponent,
    createRootImpl(container) {
      createdRoots.push(container);
      return {
        render(element) {
          rendered.push(element);
        },
        unmount() {
          unmounts.push(true);
        },
      };
    },
  });

  const seed = controller.createEditorElement({ root: root as unknown as Element });
  assert.equal(seed?.className, "mn-tiptap-react-seed");

  const mount = controller.mount({
    root: root as unknown as Element,
    editor,
    entry,
  });
  assert.equal(root.children.length, 1);
  assert.equal(root.children[0]?.className, "mn-tiptap-react-root");
  assert.equal(createdRoots[0], root.children[0]);
  assert.equal(rendered.length, 1);
  assert.equal(rendered[0]?.props.editor, editor);
  assert.equal(rendered[0]?.props.entry, entry);
  assert.equal(rendered[0]?.props.components, components);

  mount.refresh(nextEntry);
  assert.equal(rendered.length, 2);
  assert.equal(rendered[1]?.props.entry, nextEntry);

  mount.destroy();
  assert.deepEqual(unmounts, [true]);
  assert.equal(root.children.length, 0);
});

test("Tiptap React mount controller keeps the legacy editor mount fallback", () => {
  const calls: Array<unknown> = [];
  const root = createRoot();
  const editor = {
    mount(target: unknown) {
      calls.push(target);
    },
  };
  const controller = createTiptapLegacyMountController();

  assert.equal(controller.createEditorElement(), null);
  const mount = controller.mount({
    root: root as unknown as Element,
    editor,
  });

  assert.deepEqual(calls, [root]);
  assert.doesNotThrow(() => mount.refresh());
  assert.doesNotThrow(() => mount.destroy());
});
