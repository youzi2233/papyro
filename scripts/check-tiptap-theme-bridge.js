#!/usr/bin/env node
import { readFileSync } from "node:fs";

const THEME_SELECTORS = [
  [":root", "light/default"],
  [':root[data-theme="dark"]', "dark"],
  [':root[data-theme="github_light"]', "github light"],
  [':root[data-theme="github_dark"]', "github dark"],
  [':root[data-theme="high_contrast"]', "high contrast"],
  [':root[data-theme="warm_reading"]', "warm reading"],
  [":root:not([data-theme])", "system dark media"],
];

const DESKTOP_THEME_TOKENS = [
  "--mn-bg",
  "--mn-surface",
  "--mn-surface-raised",
  "--mn-surface-sunken",
  "--mn-sidebar-bg",
  "--mn-ink",
  "--mn-ink-2",
  "--mn-ink-3",
  "--mn-border",
  "--mn-border-strong",
  "--mn-divider",
  "--mn-accent",
  "--mn-accent-strong",
  "--mn-editor-bg",
  "--mn-editor-ink",
  "--mn-selection",
  "--mn-caret",
  "--mn-markdown-code-bg",
  "--mn-markdown-code-block-bg",
  "--mn-markdown-code-color",
  "--mn-code-token-comment",
  "--mn-code-token-keyword",
  "--mn-code-token-string",
  "--mn-code-token-number",
  "--mn-code-token-title",
  "--mn-code-token-attribute",
  "--mn-code-token-type",
  "--mn-code-token-operator",
];

const MOBILE_THEME_TOKENS = [
  "--mn-bg",
  "--mn-panel",
  "--mn-panel-strong",
  "--mn-border",
  "--mn-border-strong",
  "--mn-text",
  "--mn-muted",
  "--mn-accent",
  "--mn-accent-dark",
  "--mn-accent-strong",
  "--mn-surface",
  "--mn-surface-raised",
  "--mn-surface-sunken",
  "--mn-sidebar-bg",
  "--mn-ink",
  "--mn-ink-2",
  "--mn-ink-3",
  "--mn-editor-bg",
  "--mn-editor-ink",
  "--mn-selection-bg",
  "--mn-caret",
  "--mn-markdown-code-bg",
  "--mn-markdown-code-block-bg",
  "--mn-markdown-code-color",
  "--mn-code-token-comment",
  "--mn-code-token-keyword",
  "--mn-code-token-string",
  "--mn-code-token-number",
  "--mn-code-token-title",
  "--mn-code-token-attribute",
  "--mn-code-token-type",
  "--mn-code-token-operator",
];

const BRIDGE_REQUIREMENTS = [
  ["--tt-bg-color", "var(--mn-editor-bg"],
  ["--tt-border-color", "var(--mn-divider"],
  ["--tt-border-color-tint", "var(--mn-divider"],
  ["--tt-sidebar-bg-color", "var(--mn-sidebar-bg"],
  ["--tt-scrollbar-color", "var(--mn-ink-3"],
  ["--tt-cursor-color", "var(--mn-caret"],
  ["--tt-selection-color", "var(--mn-selection-bg"],
  ["--tt-card-bg-color", "var(--mn-surface-raised"],
  ["--tt-card-border-color", "var(--mn-divider"],
  ["--tt-shadow-elevated-md", "var(--mn-shadow"],
  ["--tt-brand-color-50", "var(--mn-accent"],
  ["--tt-brand-color-500", "var(--mn-accent"],
  ["--tt-brand-color-600", "var(--mn-accent-strong"],
  ["--tt-brand-color-900", "var(--mn-accent-strong"],
  ["--tt-radius-md", "var(--mn-radius"],
  ["--tt-transition-duration-default", "var(--mn-motion-theme-duration"],
  ["--tt-table-border-color", "var(--mn-border"],
  ["--tt-table-selected-bg", "var(--mn-accent"],
  ["--tt-table-selected-stroke", "var(--mn-accent"],
  ["--tt-table-column-resize-handle-bg", "var(--mn-accent"],
  ["--tt-table-cell-padding", "var(--mn-markdown-table-cell-pad"],
  ["--tt-table-margin-block", "var(--mn-markdown-block-gap"],
  ["--tt-table-handle-bg-color", "var(--mn"],
  ["--tt-table-extend-icon-color", "var(--mn-ink-3"],
];

const THEME_FILES = [
  {
    path: "assets/main.css",
    tokens: DESKTOP_THEME_TOKENS,
  },
  {
    path: "apps/desktop/assets/main.css",
    tokens: DESKTOP_THEME_TOKENS,
  },
  {
    path: "apps/mobile/assets/main.css",
    tokens: MOBILE_THEME_TOKENS,
  },
];

const BRIDGE_FILES = [
  "assets/main.css",
  "apps/desktop/assets/main.css",
  "apps/mobile/assets/main.css",
  "js/src/styles/_variables.scss",
];

function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    return;
  }

  if (args.includes("--self-test")) {
    runSelfTest();
    return;
  }

  const unexpectedOption = args.find((arg) => arg.startsWith("-"));
  if (unexpectedOption) {
    console.error(`Unknown option: ${unexpectedOption}`);
    printUsage();
    process.exitCode = 2;
    return;
  }

  const failures = [
    ...THEME_FILES.flatMap(({ path, tokens }) =>
      checkThemeFile(path, readFileSync(path, "utf8"), tokens),
    ),
    ...BRIDGE_FILES.flatMap((path) => checkBridgeFile(path, readFileSync(path, "utf8"))),
    ...checkThemeDomScript("crates/ui/src/theme/mod.rs", readFileSync("crates/ui/src/theme/mod.rs", "utf8")),
  ];

  if (failures.length > 0) {
    console.error("Tiptap theme bridge check failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("Tiptap theme bridge check passed.");
}

function printUsage() {
  console.log(`Usage:
  node scripts/check-tiptap-theme-bridge.js
  node scripts/check-tiptap-theme-bridge.js --self-test

Checks that Papyro light/dark editor theme variables feed the official Tiptap
--tt-* bridge and that the runtime keeps Tiptap's .dark class synchronized.`);
}

function checkThemeFile(path, source, requiredTokens) {
  const failures = [];
  for (const [selector, label] of THEME_SELECTORS) {
    const block = ruleBlock(source, selector);
    if (!block) {
      failures.push(`${path}: missing ${label} theme selector ${selector}`);
      continue;
    }
    if (!/color-scheme\s*:\s*(light|dark)\s*;/.test(block)) {
      failures.push(`${path}: ${label} theme is missing color-scheme`);
    }
    const tokens = parseCustomProperties(block);
    for (const token of requiredTokens) {
      if (!tokens.has(token)) {
        failures.push(`${path}: ${label} theme missing ${token}`);
      }
    }
  }
  return failures;
}

function checkBridgeFile(path, source) {
  const failures = [];
  const declarations = parseCustomProperties(source);
  for (const [token, fragment] of BRIDGE_REQUIREMENTS) {
    const value = declarations.get(token);
    if (!value) {
      failures.push(`${path}: missing official bridge token ${token}`);
    } else if (!compact(value).includes(compact(fragment))) {
      failures.push(`${path}: ${token} must derive from ${fragment}, got ${value}`);
    }
  }
  return failures;
}

function checkThemeDomScript(path, source) {
  const checks = [
    ['root.setAttribute("data-theme", theme)', "sets explicit data-theme"],
    ['root.removeAttribute("data-theme")', "removes data-theme for system mode"],
    ['root.classList.toggle("dark", dark)', "synchronizes official Tiptap .dark class"],
    ['window.matchMedia("(prefers-color-scheme: dark)")', "tracks system dark preference"],
  ];
  return checks
    .filter(([fragment]) => !source.includes(fragment))
    .map(([, label]) => `${path}: theme DOM script no longer ${label}`);
}

function ruleBlock(source, selector) {
  const selectorIndex = source.indexOf(selector);
  if (selectorIndex < 0) return null;
  const openIndex = source.indexOf("{", selectorIndex);
  if (openIndex < 0) return null;

  let depth = 0;
  for (let index = openIndex; index < source.length; index += 1) {
    if (source[index] === "{") {
      depth += 1;
    } else if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(openIndex + 1, index);
      }
    }
  }
  return null;
}

function parseCustomProperties(source) {
  const declarations = new Map();
  const declarationPattern = /(--[\w-]+)\s*:\s*([^;]+);/g;
  for (const match of source.matchAll(declarationPattern)) {
    declarations.set(match[1], match[2].trim());
  }
  return declarations;
}

function compact(value) {
  return value.replace(/\s+/g, "");
}

function runSelfTest() {
  const css = `
:root {
  color-scheme: light;
${MOBILE_THEME_TOKENS.map((token) => `  ${token}: #111111;`).join("\n")}
${BRIDGE_REQUIREMENTS.map(([token, fragment]) => `  ${token}: ${fragment}, #111111);`).join("\n")}
}
${THEME_SELECTORS.slice(1)
  .map(
    ([selector]) => `${selector} {
  color-scheme: dark;
${MOBILE_THEME_TOKENS.map((token) => `  ${token}: #111111;`).join("\n")}
}`,
  )
  .join("\n")}
`;
  assert(checkThemeFile("self.css", css, MOBILE_THEME_TOKENS).length === 0);
  assert(checkBridgeFile("self.css", css).length === 0);
  assert(
    checkThemeFile(
      "self.css",
      css.replace("  --mn-editor-bg: #111111;\n", ""),
      MOBILE_THEME_TOKENS,
    ).some((failure) => failure.includes("--mn-editor-bg")),
  );
  assert(
    checkBridgeFile(
      "self.css",
      css.replace("--tt-bg-color: var(--mn-editor-bg", "--tt-bg-color: #ffffff"),
    ).some((failure) => failure.includes("--tt-bg-color")),
  );

  const script = `
root.setAttribute("data-theme", theme);
root.removeAttribute("data-theme");
root.classList.toggle("dark", dark);
window.matchMedia("(prefers-color-scheme: dark)");
`;
  assert(checkThemeDomScript("theme.rs", script).length === 0);
  assert(
    checkThemeDomScript("theme.rs", script.replace('root.classList.toggle("dark", dark);', ""))
      .length === 1,
  );

  console.log("Tiptap theme bridge checker self-test passed.");
}

function assert(condition) {
  if (!condition) {
    throw new Error("Tiptap theme bridge checker self-test failed");
  }
}

main();
