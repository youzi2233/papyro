import React from "react";
import {
  Code2,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  List,
  ListOrdered,
  ListChecks,
  MessageSquareText,
  Pilcrow,
  Quote,
  SeparatorHorizontal,
  Sigma,
  SquareCode,
  TableProperties,
  Workflow,
} from "lucide-react";

const ICON_PROPS = Object.freeze({
  className: "mn-tiptap-command-icon-svg",
  size: 15,
  strokeWidth: 1.85,
  absoluteStrokeWidth: true,
  "aria-hidden": "true",
  focusable: "false",
});

function LucideCommandIcon({ as: Icon }) {
  return <Icon {...ICON_PROPS} />;
}

const COMMAND_ICONS = Object.freeze({
  paragraph: <LucideCommandIcon as={Pilcrow} />,
  "heading-1": <LucideCommandIcon as={Heading1} />,
  "heading-2": <LucideCommandIcon as={Heading2} />,
  "heading-3": <LucideCommandIcon as={Heading3} />,
  "bullet-list": <LucideCommandIcon as={List} />,
  "ordered-list": <LucideCommandIcon as={ListOrdered} />,
  "task-list": <LucideCommandIcon as={ListChecks} />,
  quote: <LucideCommandIcon as={Quote} />,
  callout: <LucideCommandIcon as={MessageSquareText} />,
  "code-block": <LucideCommandIcon as={SquareCode} />,
  divider: <LucideCommandIcon as={SeparatorHorizontal} />,
  table: <LucideCommandIcon as={TableProperties} />,
  math: <LucideCommandIcon as={Sigma} />,
  mermaid: <LucideCommandIcon as={Workflow} />,
  image: <LucideCommandIcon as={ImagePlus} />,
  "code-language": <LucideCommandIcon as={Code2} />,
  file: <LucideCommandIcon as={FileText} />,
});

export function CommandMenuIcon({ icon }) {
  return COMMAND_ICONS[icon] ?? COMMAND_ICONS.paragraph;
}
