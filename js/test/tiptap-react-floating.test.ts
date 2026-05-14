import test from "node:test";
import assert from "node:assert/strict";

import {
  anchorRectFromEditorRange,
  positionReactFloatingElement,
  shouldFlipFloatingSidePanel,
  usableFloatingRect,
} from "../src/tiptap-react/utils/floating.ts";

function reference(width = 320, height = 240) {
  return {
    ownerDocument: {
      documentElement: {
        clientWidth: width,
        clientHeight: height,
      },
    },
  };
}

function floatingElement(width = 80, height = 40) {
  return {
    offsetWidth: width,
    offsetHeight: height,
    style: {},
  };
}

test("React floating utilities validate editor anchor rects", () => {
  assert.equal(usableFloatingRect(null), false);
  assert.equal(usableFloatingRect({ left: 0, top: 0, right: 0, bottom: 0 }), false);
  assert.equal(usableFloatingRect({ left: "10", top: "20", right: "40", bottom: "50" }), true);

  const rect = { left: 12, top: 20, right: 24, bottom: 36 };
  assert.equal(
    anchorRectFromEditorRange(
      {
        view: {
          coordsAtPos(position) {
            assert.equal(position, 7);
            return rect;
          },
        },
      },
      { to: 7 },
    ),
    rect,
  );
});

test("React floating utilities position valid floating elements", () => {
  const element = floatingElement();

  assert.equal(positionReactFloatingElement({ element, rect: null }), false);
  assert.equal(
    positionReactFloatingElement({
      element,
      reference: reference(),
      rect: { left: 120, top: 60, right: 180, bottom: 88 },
    }),
    true,
  );

  assert.equal(element.style.left, "110px");
  assert.equal(element.style.top, "96px");
});

test("React floating utilities decide side panel flipping from viewport room", () => {
  assert.equal(
    shouldFlipFloatingSidePanel({
      root: {
        getBoundingClientRect: () => ({ left: 220, top: 40, right: 300, bottom: 90 }),
      },
      reference: reference(360, 240),
      panelWidth: 90,
      gap: 8,
      margin: 10,
    }),
    true,
  );

  assert.equal(
    shouldFlipFloatingSidePanel({
      root: {
        getBoundingClientRect: () => ({ left: 20, top: 40, right: 100, bottom: 90 }),
      },
      reference: reference(360, 240),
      panelWidth: 90,
      gap: 8,
      margin: 10,
    }),
    false,
  );
});
