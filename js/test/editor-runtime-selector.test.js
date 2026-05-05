import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_EDITOR_RUNTIME_KIND,
  FALLBACK_EDITOR_RUNTIME_KIND,
  normalizeEditorRuntimeKind,
  selectEditorRuntimeAdapter,
} from "../src/editor-runtime-selector.js";

test("editor runtime selector defaults to Tiptap on the migration branch", () => {
  assert.equal(DEFAULT_EDITOR_RUNTIME_KIND, "tiptap");
  assert.equal(FALLBACK_EDITOR_RUNTIME_KIND, "codemirror");
  assert.equal(normalizeEditorRuntimeKind(undefined), "tiptap");
  assert.equal(normalizeEditorRuntimeKind("unknown"), "tiptap");
});

test("editor runtime selector uses Tiptap by default", () => {
  const adapters = {
    codemirror: { kind: "codemirror" },
    tiptap: { kind: "tiptap" },
  };

  assert.equal(selectEditorRuntimeAdapter({ requestedKind: undefined, adapters }), adapters.tiptap);
  assert.equal(selectEditorRuntimeAdapter({ requestedKind: "tiptap", adapters }), adapters.tiptap);
});

test("editor runtime selector keeps an explicit CodeMirror fallback", () => {
  const adapters = {
    codemirror: { kind: "codemirror" },
    tiptap: { kind: "tiptap" },
  };

  assert.equal(
    selectEditorRuntimeAdapter({ requestedKind: "codemirror", adapters }),
    adapters.codemirror,
  );
});

test("editor runtime selector falls back to CodeMirror when Tiptap is absent", () => {
  const adapters = {
    codemirror: { kind: "codemirror" },
  };

  assert.equal(
    selectEditorRuntimeAdapter({ requestedKind: "tiptap", adapters }),
    adapters.codemirror,
  );
});
