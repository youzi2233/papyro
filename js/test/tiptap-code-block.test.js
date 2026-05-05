import test from "node:test";
import assert from "node:assert/strict";

import {
  createPapyroCodeBlockOptions,
  normalizeCodeBlockLanguage,
} from "../src/tiptap-code-block.js";

test("Papyro code block options keep Tiptap's official node configurable", () => {
  assert.deepEqual(createPapyroCodeBlockOptions(), {
    defaultLanguage: null,
    enableTabIndentation: true,
    tabSize: 2,
    languageClassPrefix: "language-",
    HTMLAttributes: {
      class: "mn-tiptap-code-block",
    },
  });
});

test("Papyro code block language normalization accepts safe language ids", () => {
  assert.equal(normalizeCodeBlockLanguage("Rust"), "rust");
  assert.equal(normalizeCodeBlockLanguage("ts-node"), "ts-node");
  assert.equal(normalizeCodeBlockLanguage("c++"), "c++");
  assert.equal(normalizeCodeBlockLanguage(""), null);
  assert.equal(normalizeCodeBlockLanguage("bad lang"), null);
  assert.equal(normalizeCodeBlockLanguage("x".repeat(80)), null);
});
