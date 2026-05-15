import test from "node:test";
import assert from "node:assert/strict";
import { importBundledModule } from "./helpers/load-esbuild-module.js";

const { canUseColorMenu } = await importBundledModule(
  new URL("../src/components/tiptap-ui/color-menu/color-menu.tsx", import.meta.url),
);

test("Tiptap color menu ignores missing node background can-command", () => {
  const calls = [];
  const editor = {
    can() {
      return {
        setMark(name) {
          calls.push(["setMark", name]);
          return false;
        },
      };
    },
  };

  assert.equal(canUseColorMenu(editor), false);
  assert.deepEqual(calls, [
    ["setMark", "textStyle"],
    ["setMark", "highlight"],
  ]);
});

test("Tiptap color menu stays available for node background commands", () => {
  const editor = {
    can() {
      return {
        setMark() {
          return false;
        },
        toggleNodeBackgroundColor(backgroundColor) {
          return backgroundColor === "yellow";
        },
      };
    },
  };

  assert.equal(canUseColorMenu(editor), true);
});

test("Tiptap color menu treats throwing can-commands as unavailable", () => {
  const editor = {
    can() {
      return {
        setMark() {
          throw new TypeError("mark command is temporarily unavailable");
        },
        toggleNodeBackgroundColor() {
          throw new TypeError("node background command is temporarily unavailable");
        },
      };
    },
  };

  assert.equal(canUseColorMenu(editor), false);
});
