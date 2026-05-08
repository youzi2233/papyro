import {
  PAPYRO_HIGHLIGHT_OPTIONS,
  PAPYRO_TEXT_COLOR_OPTIONS,
} from "./tiptap-text-style.js";

const FORMAT_MARK_IDS = Object.freeze([
  "bold",
  "italic",
  "underline",
  "strike",
  "code",
  "link",
]);

function active(editor, name, attrs) {
  if (typeof editor?.isActive !== "function") {
    return false;
  }
  return attrs ? editor.isActive(name, attrs) === true : editor.isActive(name) === true;
}

function attrColor(editor, name) {
  const value = editor?.getAttributes?.(name)?.color;
  return typeof value === "string" && value.trim() ? value : null;
}

function freezeEntries(entries) {
  return Object.freeze(Object.fromEntries(entries));
}

export function createPapyroTiptapFormatSnapshot(editor = null) {
  const textColor = attrColor(editor, "textStyle");
  const highlightColor = attrColor(editor, "highlight");
  const marks = freezeEntries(
    FORMAT_MARK_IDS.map((id) => [id, active(editor, id)]),
  );
  const textColors = freezeEntries(
    PAPYRO_TEXT_COLOR_OPTIONS.map((option) => [
      option.id,
      textColor === (option.color ?? null),
    ]),
  );
  const highlights = freezeEntries(
    PAPYRO_HIGHLIGHT_OPTIONS.map((option) => [
      option.id,
      option.color
        ? active(editor, "highlight", { color: option.color }) || highlightColor === option.color
        : false,
    ]),
  );

  return Object.freeze({
    marks,
    textColor,
    highlightColor,
    textColors,
    highlights,
  });
}

function sameRecord(left = {}, right = {}, keys = []) {
  return keys.every((key) => left?.[key] === right?.[key]);
}

export function samePapyroTiptapFormatSnapshot(left, right) {
  if (left === right) return true;
  if (!left || !right) return false;

  return (
    sameRecord(left.marks, right.marks, FORMAT_MARK_IDS)
    && sameRecord(
      left.textColors,
      right.textColors,
      PAPYRO_TEXT_COLOR_OPTIONS.map((option) => option.id),
    )
    && sameRecord(
      left.highlights,
      right.highlights,
      PAPYRO_HIGHLIGHT_OPTIONS.map((option) => option.id),
    )
    && left.textColor === right.textColor
    && left.highlightColor === right.highlightColor
  );
}
