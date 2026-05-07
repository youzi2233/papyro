const COMPACT_GROUPS = new Set(["Color", "Highlight", "Callout"]);
const SUBMENU_ORDER = ["turn-into", "code-language"];

function submenuOrder(submenu) {
  const index = SUBMENU_ORDER.indexOf(submenu);
  return index < 0 ? Number.MAX_SAFE_INTEGER : index;
}

function groupLayout(groupName) {
  return COMPACT_GROUPS.has(groupName) ? "swatch" : "list";
}

function groupTone(commands) {
  return commands.some((command) => command.tone === "danger") ? "danger" : "default";
}

export function groupBlockActionCommands(commands = []) {
  const groups = [];
  const groupByName = new Map();

  commands.forEach((command, index) => {
    if (command?.submenu) return;
    const groupKey = command?.groupKey || command?.group || "Actions";
    let group = groupByName.get(groupKey);
    if (!group) {
      group = {
        key: groupKey,
        name: command?.group || groupKey,
        commands: [],
      };
      groupByName.set(groupKey, group);
      groups.push(group);
    }
    group.commands.push({ ...command, index: command?.index ?? index });
  });

  return groups.map((group) => ({
    ...group,
    layout: groupLayout(group.key),
    tone: groupTone(group.commands),
  }));
}

export function blockActionSubmenuGroups(commands = []) {
  return commands
    .map((command, index) => ({ command, index }))
    .filter(({ command }) => command?.submenu && Array.isArray(command.children))
    .map(({ command, index }) => ({
      id: command.submenu,
      name: command.title,
      description: command.description,
      trigger: { ...command, index: command.index ?? index },
      commands: command.children.map((child) => ({ ...child })),
    }))
    .sort((left, right) => submenuOrder(left.id) - submenuOrder(right.id));
}

export function commandSubmenuId(command) {
  if (!command) return "";
  if (command.submenu && Array.isArray(command.children)) return command.submenu;
  return command.submenu ?? "";
}

export function blockActionSubmenuPanelWidth() {
  return 160;
}
