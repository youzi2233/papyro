import test from "node:test";
import assert from "node:assert/strict";

import {
  blockActionSubmenuGroups,
  blockActionSubmenuPanelWidth,
  commandSubmenuId,
  groupBlockActionCommands,
} from "../src/tiptap-react/commands/block-action-menu-model.js";

test("React block action menu model groups top-level commands", () => {
  assert.deepEqual(
    groupBlockActionCommands([
      { id: "copy-block", group: "Actions" },
      { id: "delete", group: "Actions", tone: "danger" },
      { id: "text-color-accent", group: "Color" },
      { id: "heading-1", group: "Text", submenu: "turn-into" },
    ]),
    [
      {
        key: "Actions",
        name: "Actions",
        layout: "list",
        tone: "danger",
        commands: [
          { id: "copy-block", group: "Actions", index: 0 },
          { id: "delete", group: "Actions", tone: "danger", index: 1 },
        ],
      },
      {
        key: "Color",
        name: "Color",
        layout: "swatch",
        tone: "default",
        commands: [{ id: "text-color-accent", group: "Color", index: 2 }],
      },
    ],
  );
});

test("React block action menu model extracts ordered submenu groups", () => {
  const groups = blockActionSubmenuGroups([
    {
      id: "code-language",
      title: "Code language",
      description: "Change language",
      submenu: "code-language",
      children: [{ id: "code-language-rust", title: "Rust" }],
    },
    {
      id: "turn-into",
      title: "Turn into",
      description: "Change block type",
      submenu: "turn-into",
      children: [{ id: "heading-1", title: "Heading 1" }],
    },
  ]);

  assert.deepEqual(groups.map((group) => group.id), ["turn-into", "code-language"]);
  assert.deepEqual(groups[0].commands, [{ id: "heading-1", title: "Heading 1" }]);
});

test("React block action menu model exposes submenu contracts", () => {
  assert.equal(commandSubmenuId({ submenu: "turn-into", children: [] }), "turn-into");
  assert.equal(commandSubmenuId({ submenu: "turn-into" }), "turn-into");
  assert.equal(commandSubmenuId(null), "");
  assert.equal(blockActionSubmenuPanelWidth(), 160);
});
