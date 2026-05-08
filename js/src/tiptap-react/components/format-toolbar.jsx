import React from "react";

import { usePointerActivation } from "../hooks/use-pointer-activation.js";

function FormatToolbarButton({ command, run }) {
  const activation = usePointerActivation(() => run(command.id));

  return (
    <button
      type="button"
      className={`mn-tiptap-format-toolbar-button${command.active ? " active" : ""}`}
      title={command.title}
      aria-label={command.ariaLabel}
      aria-pressed={String(command.active)}
      data-command-id={command.id}
      data-priority={String(command.priority ?? 100)}
      {...activation}
    >
      <span
        className={`mn-tiptap-format-toolbar-icon ${command.icon}`}
        aria-hidden="true"
      />
      <span className="mn-tiptap-format-toolbar-label">
        {command.label}
      </span>
    </button>
  );
}

export function PapyroFormatToolbar({ state }) {
  const commands = state?.commands ?? [];

  return (
    <div className="mn-tiptap-format-toolbar-list">
      {commands.map((command) => (
        <FormatToolbarButton
          key={command.id}
          command={command}
          run={state.run}
        />
      ))}
    </div>
  );
}
