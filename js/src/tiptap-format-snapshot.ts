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

type FormatMarkId = (typeof FORMAT_MARK_IDS)[number];
type FormatOption = {
  id: string;
  color?: string | null;
};
type FormatSnapshot = Readonly<{
  marks: Readonly<Record<FormatMarkId, boolean>>;
  textColor: string | null;
  highlightColor: string | null;
  textColors: Readonly<Record<string, boolean>>;
  highlights: Readonly<Record<string, boolean>>;
}>;
type TiptapFormatEditor = {
  isActive?: (name: string, attrs?: Record<string, unknown>) => boolean;
  getAttributes?: (name: string) => Record<string, unknown>;
};

function active(
  editor: TiptapFormatEditor | null | undefined,
  name: string,
  attrs?: Record<string, unknown>,
) {
  if (typeof editor?.isActive !== "function") {
    return false;
  }
  return attrs ? editor.isActive(name, attrs) === true : editor.isActive(name) === true;
}

function attrColor(editor: TiptapFormatEditor | null | undefined, name: string) {
  const value = editor?.getAttributes?.(name)?.color;
  return typeof value === "string" && value.trim() ? value : null;
}

function freezeEntries<T extends string>(entries: Iterable<readonly [T, boolean]>) {
  return Object.freeze(Object.fromEntries(entries));
}

function textColorOptions() {
  return PAPYRO_TEXT_COLOR_OPTIONS as readonly FormatOption[];
}

function highlightOptions() {
  return PAPYRO_HIGHLIGHT_OPTIONS as readonly FormatOption[];
}

export function createPapyroTiptapFormatSnapshot(
  editor: TiptapFormatEditor | null = null,
): FormatSnapshot {
  const textColor = attrColor(editor, "textStyle");
  const highlightColor = attrColor(editor, "highlight");
  const marks = freezeEntries(
    FORMAT_MARK_IDS.map((id) => [id, active(editor, id)]),
  );
  const textColors = freezeEntries(
    textColorOptions().map((option) => [
      option.id,
      textColor === (option.color ?? null),
    ]),
  );
  const highlights = freezeEntries(
    highlightOptions().map((option) => [
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

function sameRecord(
  left: Readonly<Record<string, boolean>> | null | undefined = {},
  right: Readonly<Record<string, boolean>> | null | undefined = {},
  keys: readonly string[] = [],
) {
  return keys.every((key) => left?.[key] === right?.[key]);
}

export function samePapyroTiptapFormatSnapshot(
  left: FormatSnapshot | null | undefined,
  right: FormatSnapshot | null | undefined,
) {
  if (left === right) return true;
  if (!left || !right) return false;

  return (
    sameRecord(left.marks, right.marks, FORMAT_MARK_IDS)
    && sameRecord(
      left.textColors,
      right.textColors,
      textColorOptions().map((option) => option.id),
    )
    && sameRecord(
      left.highlights,
      right.highlights,
      highlightOptions().map((option) => option.id),
    )
    && left.textColor === right.textColor
    && left.highlightColor === right.highlightColor
  );
}
