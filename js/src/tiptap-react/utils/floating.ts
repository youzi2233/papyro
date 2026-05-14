import {
  defaultWindow,
  positionFloatingElement,
  viewportSize,
} from "../../tiptap-ui-primitives.ts";

type FloatingRectLike = {
  left?: unknown;
  top?: unknown;
  right?: unknown;
  bottom?: unknown;
};

type EditorRangeLike = {
  to: number;
};

type TiptapEditorLike = {
  view?: {
    coordsAtPos?: (position: number) => FloatingRectLike;
  };
};

type ElementLike = {
  ownerDocument?: {
    documentElement?: {
      clientWidth?: number;
      clientHeight?: number;
    };
  };
  getBoundingClientRect?: () => FloatingRectLike;
  offsetWidth?: number;
  offsetHeight?: number;
  style?: {
    left?: string;
    top?: string;
  };
};

type FloatingPlacement = "bottom" | "top" | "left" | "right";

type FloatingSizeLike = {
  width?: number;
  height?: number;
  margin?: number;
};

type PositionReactFloatingElementOptions = {
  element?: ElementLike | null;
  rect?: FloatingRectLike | null;
  reference?: ElementLike | null;
  fallbackWindow?: ReturnType<typeof defaultWindow>;
  size?: FloatingSizeLike;
  placement?: FloatingPlacement;
};

type ShouldFlipFloatingSidePanelOptions = {
  root?: ElementLike | null;
  reference?: ElementLike | null;
  panelWidth?: number;
  gap?: number;
  margin?: number;
  fallbackWindow?: ReturnType<typeof defaultWindow>;
};

type UsableFloatingRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

const EMPTY_VIEWPORT_REFERENCE: ElementLike = {};

function viewportReference(reference: ElementLike | null | undefined): ElementLike {
  return reference ?? EMPTY_VIEWPORT_REFERENCE;
}

function normalizeFloatingRect(
  rect: FloatingRectLike | null | undefined,
): UsableFloatingRect | null {
  if (!rect) return null;
  const left = Number(rect.left);
  const top = Number(rect.top);
  const right = Number(rect.right);
  const bottom = Number(rect.bottom);
  if (![left, top, right, bottom].every(Number.isFinite)) return null;
  if (Math.abs(left) + Math.abs(top) > 0 || right > left || bottom > top) {
    return { left, top, right, bottom };
  }
  return null;
}

export function usableFloatingRect(rect: FloatingRectLike | null | undefined) {
  return normalizeFloatingRect(rect) !== null;
}

export function anchorRectFromEditorRange(
  editor: TiptapEditorLike | null | undefined,
  range: EditorRangeLike | null | undefined,
) {
  const view = editor?.view;
  if (!view || typeof view.coordsAtPos !== "function" || !range) return null;

  try {
    const rect = view.coordsAtPos(range.to);
    return usableFloatingRect(rect) ? rect : null;
  } catch (_error) {
    return null;
  }
}

export function positionReactFloatingElement({
  element,
  rect,
  reference = null,
  fallbackWindow = null,
  size,
  placement = "bottom",
}: PositionReactFloatingElementOptions = {}) {
  const usableRect = normalizeFloatingRect(rect);
  if (!element || !usableRect) return false;
  positionFloatingElement(element, usableRect, {
    viewport: viewportSize(viewportReference(reference), fallbackWindow),
    size,
    placement,
  });
  return true;
}

export function shouldFlipFloatingSidePanel({
  root,
  reference = null,
  panelWidth = 0,
  gap = 6,
  margin = 10,
  fallbackWindow = defaultWindow(reference?.ownerDocument),
}: ShouldFlipFloatingSidePanelOptions = {}) {
  const rect = normalizeFloatingRect(root?.getBoundingClientRect?.());
  const width = Number(panelWidth);
  if (!rect || !Number.isFinite(width) || width <= 0) {
    return false;
  }

  const viewport = viewportSize(viewportReference(reference), fallbackWindow);
  const neededWidth = width + gap + margin;
  return rect.right + neededWidth > viewport.width && rect.left - neededWidth > margin;
}
