import React, { useMemo } from "react";

import {
  blockActionTargetLabel,
  blockHandleActionsLabel,
} from "../../tiptap-i18n.js";
import { commandElementId } from "../../tiptap-ui-primitives.js";
import {
  blockActionSubmenuGroups,
  commandSubmenuId,
  groupBlockActionCommands,
} from "../commands/block-action-menu-model.js";
import { usePointerActivation } from "../hooks/use-pointer-activation.js";

function MenuIcon({ icon }) {
  return (
    <span
      className={`mn-tiptap-block-action-menu-icon ${icon ?? "block"}`}
      aria-hidden="true"
    />
  );
}

function CommandCopy({ command }) {
  return (
    <span className="mn-tiptap-block-action-menu-copy">
      <span className="mn-tiptap-block-action-menu-title">{command.title}</span>
      <span className="mn-tiptap-block-action-menu-description">
        {command.description ?? ""}
      </span>
    </span>
  );
}

function BlockActionCommandItem({
  command,
  ownerId,
  selected,
  activate,
  run,
}) {
  const activation = usePointerActivation(() => run(command.id));

  return (
    <button
      type="button"
      id={commandElementId(ownerId, command.index)}
      className={`mn-tiptap-block-action-menu-item${selected ? " active" : ""}`}
      role="menuitem"
      data-command-id={command.id}
      data-command-index={String(command.index)}
      data-submenu=""
      data-tone={command.tone}
      tabIndex={selected ? 0 : -1}
      onPointerMove={() => activate(command.index, { scroll: false })}
      onFocus={() => activate(command.index, { scroll: true })}
      {...activation}
    >
      <MenuIcon icon={command.icon} />
      <CommandCopy command={command} />
      <span className="mn-tiptap-block-action-menu-shortcut" hidden={!command.shortcut}>
        {command.shortcut ?? ""}
      </span>
    </button>
  );
}

function SubmenuTrigger({
  group,
  ownerId,
  selectedIndex,
  activate,
}) {
  const selected = group.trigger.index === selectedIndex;

  return (
    <button
      type="button"
      id={commandElementId(ownerId, group.trigger.index)}
      className={`mn-tiptap-block-action-menu-item mn-tiptap-block-action-submenu-trigger${selected ? " active" : ""}`}
      role="menuitem"
      data-command-id={group.trigger.id}
      data-command-index={String(group.trigger.index)}
      data-submenu-trigger={group.id}
      tabIndex={selected ? 0 : -1}
      onPointerMove={() => activate(group.trigger.index, { scroll: false })}
      onFocus={() => activate(group.trigger.index, { scroll: true })}
    >
      <MenuIcon icon={group.id === "code-language" ? "code-language" : "turn-into"} />
      <CommandCopy command={{ title: group.name, description: group.description }} />
      <span className="mn-tiptap-block-action-submenu-arrow" aria-hidden="true" />
    </button>
  );
}

function SubmenuPanelItem({
  command,
  commandIndex,
  groupId,
  ownerId,
  selected,
  activate,
  run,
}) {
  const activation = usePointerActivation(() => run(command.id));

  return (
    <button
      type="button"
      id={commandElementId(ownerId, commandIndex)}
      className={`mn-tiptap-block-action-submenu-item${selected ? " active" : ""}`}
      role="menuitem"
      data-command-id={command.id}
      data-command-index={String(commandIndex)}
      data-submenu={groupId}
      data-active={command.active ? "true" : "false"}
      tabIndex={selected ? 0 : -1}
      onPointerMove={() => {
        if (commandIndex >= 0) {
          activate(commandIndex, { scroll: false });
        }
      }}
      onFocus={() => {
        if (commandIndex >= 0) {
          activate(commandIndex, { scroll: true });
        }
      }}
      {...activation}
    >
      <MenuIcon icon={command.icon} />
      <CommandCopy command={command} />
    </button>
  );
}

function BlockActionSubmenu({
  group,
  commands,
  ownerId,
  selectedIndex,
  activate,
  run,
}) {
  const activeSubmenu = commandSubmenuId(commands[selectedIndex]);
  const active = activeSubmenu === group.id;

  return (
    <section
      className="mn-tiptap-block-action-submenu"
      role="group"
      data-submenu={group.id}
      data-active={active ? "true" : "false"}
    >
      <div className="mn-tiptap-block-action-submenu-panel">
        {group.commands.map((command) => {
          const commandIndex = Number.isInteger(command.index)
            ? command.index
            : commands.findIndex(
                (candidate) =>
                  candidate.submenu === group.id && candidate.id === command.id,
              );
          return (
            <SubmenuPanelItem
              key={command.id}
              command={command}
              commandIndex={commandIndex}
              groupId={group.id}
              ownerId={ownerId}
              selected={commandIndex === selectedIndex}
              activate={activate}
              run={run}
            />
          );
        })}
      </div>
    </section>
  );
}

export function PapyroBlockActionMenu({
  ownerId,
  state,
  language = "english",
}) {
  const commands = state?.commands ?? [];
  const selectedIndex = state?.selectedIndex ?? 0;
  const groups = useMemo(() => groupBlockActionCommands(commands), [commands]);
  const submenus = useMemo(() => blockActionSubmenuGroups(commands), [commands]);
  const actionGroupIndex = groups.findIndex((group) => group.key === "Actions");
  const activeSubmenu = commandSubmenuId(commands[selectedIndex]);
  const targetKind = state?.target?.kind ?? "block";

  return (
    <>
      <div className="mn-tiptap-block-action-menu-header">
        <div className="mn-tiptap-block-action-menu-eyebrow">
          {blockHandleActionsLabel(language)}
        </div>
        <div className="mn-tiptap-block-action-menu-heading">
          {blockActionTargetLabel(language, targetKind)}
        </div>
      </div>
      <div className="mn-tiptap-block-action-menu-body">
        <div className="mn-tiptap-block-action-menu-list">
          {groups.map((group, groupIndex) => (
            <section
              key={group.key}
              className="mn-tiptap-block-action-menu-section"
              role="group"
              aria-label={group.name}
              data-group={group.key}
              data-layout={group.layout}
              data-tone={group.tone}
            >
              <div className="mn-tiptap-block-action-menu-section-title">
                {group.name}
              </div>
              {group.commands.map((command) => (
                <BlockActionCommandItem
                  key={command.id}
                  command={command}
                  ownerId={ownerId}
                  selected={command.index === selectedIndex}
                  activate={state.activate}
                  run={state.run}
                />
              ))}
              {groupIndex === actionGroupIndex
                ? submenus.map((submenu) => (
                    <SubmenuTrigger
                      key={submenu.id}
                      group={submenu}
                      ownerId={ownerId}
                      selectedIndex={selectedIndex}
                      activate={state.activate}
                    />
                  ))
                : null}
            </section>
          ))}
        </div>
        <div className="mn-tiptap-block-action-submenus">
          {submenus.map((submenu) => (
            <BlockActionSubmenu
              key={submenu.id}
              group={submenu}
              commands={commands}
              ownerId={ownerId}
              selectedIndex={selectedIndex}
              activate={state.activate}
              run={state.run}
            />
          ))}
        </div>
        <div
          className={`mn-tiptap-block-action-submenu-hint${submenus.length === 0 ? " hidden" : ""}`}
        >
          {submenus.find((submenu) => submenu.id === activeSubmenu)?.description ??
            submenus[0]?.description ??
            ""}
        </div>
      </div>
    </>
  );
}
