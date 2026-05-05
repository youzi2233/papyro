import test from "node:test";
import assert from "node:assert/strict";

import { createPapyroTableExtensions } from "../src/tiptap-table.js";

test("Papyro table extensions expose the TableKit boundary", () => {
  const extensions = createPapyroTableExtensions();

  assert.equal(extensions.length, 1);
  assert.equal(extensions[0].name, "tableKit");
});
