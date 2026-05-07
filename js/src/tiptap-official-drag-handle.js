import {
  defaultComputePositionConfig,
  normalizeNestedOptions,
} from "@tiptap/extension-drag-handle";

const PAPYRO_COMPLEX_NODE_TYPES = new Set([
  "codeBlock",
  "image",
  "mathBlock",
  "mermaidBlock",
  "table",
]);

const PAPYRO_TABLE_STRUCTURE_TYPES = new Set([
  "tableRow",
  "tableCell",
  "tableHeader",
]);

const PAPYRO_NESTED_CONTAINERS = Object.freeze([
  "blockquote",
  "bulletList",
  "orderedList",
  "taskList",
  "listItem",
  "taskItem",
]);

export const papyroDragHandlePluginKey = "papyro-official-drag-handle";

export function createPapyroDragHandleNestedOptions() {
  return {
    defaultRules: true,
    allowedContainers: [...PAPYRO_NESTED_CONTAINERS],
    edgeDetection: {
      edges: ["left", "top"],
      threshold: 16,
      strength: 420,
    },
    rules: [papyroComplexBlockRule, papyroTableOverlayRule],
  };
}

export function createPapyroOfficialDragHandleConfig(overrides = {}) {
  const nested = overrides.nested ?? createPapyroDragHandleNestedOptions();

  return {
    pluginKey: overrides.pluginKey ?? papyroDragHandlePluginKey,
    nested,
    computePositionConfig: {
      ...defaultComputePositionConfig,
      placement: "left-start",
      strategy: "absolute",
      ...(overrides.computePositionConfig ?? {}),
    },
  };
}

export function normalizedPapyroDragHandleNestedOptions(input = createPapyroDragHandleNestedOptions()) {
  return normalizeNestedOptions(input);
}

export function papyroComplexBlockRule({ node, parent }) {
  const nodeName = nodeTypeName(node);
  const parentName = nodeTypeName(parent);

  if (PAPYRO_COMPLEX_NODE_TYPES.has(nodeName)) {
    return 0;
  }

  if (PAPYRO_COMPLEX_NODE_TYPES.has(parentName)) {
    return 1000;
  }

  return 0;
}

export function papyroTableOverlayRule({ node, parent }) {
  const nodeName = nodeTypeName(node);
  const parentName = nodeTypeName(parent);

  if (PAPYRO_TABLE_STRUCTURE_TYPES.has(nodeName)) {
    return 1000;
  }

  if (PAPYRO_TABLE_STRUCTURE_TYPES.has(parentName)) {
    return 1000;
  }

  return 0;
}

function nodeTypeName(node) {
  return String(node?.type?.name ?? "");
}
