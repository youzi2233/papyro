import React from "react";

export function PapyroBlockHandle({ state = {} }) {
  const labels = state.labels ?? {};
  const insertLabel = labels.insert ?? "Insert block below";
  const actionLabel = labels.actions ?? "Block actions";
  const rootProps = state.rootProps ?? {};
  const hidden = state.hidden === true;

  return (
    <div
      {...rootProps}
      className={[
        "mn-tiptap-block-handle-controls",
        hidden ? "hidden" : null,
        rootProps.className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-block-kind={state.target?.kind ?? undefined}
      data-dragging={state.dragging ? "true" : "false"}
      data-menu-open={state.menuOpen ? "true" : "false"}
      data-insert-open={state.insertOpen ? "true" : "false"}
    >
      <button
        type="button"
        className="mn-tiptap-block-handle-button mn-tiptap-block-handle-insert"
        title={insertLabel}
        aria-label={insertLabel}
        onPointerDown={state.onInsertPointerDown}
        onClick={state.onInsertClick}
        onAuxClick={state.onAuxClick}
        onContextMenu={state.onInsertContextMenu}
      >
        <span className="mn-tiptap-block-insert-icon" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="mn-tiptap-block-handle-button mn-tiptap-block-handle-action"
        title={actionLabel}
        aria-label={actionLabel}
        style={{ cursor: state.dragging ? "grabbing" : "grab" }}
        onPointerDown={state.onActionPointerDown}
        onPointerUp={state.onActionPointerUp}
        onClick={state.onActionClick}
        onAuxClick={state.onAuxClick}
        onContextMenu={state.onActionContextMenu}
      >
        <span className="mn-tiptap-block-handle-icon" aria-hidden="true" />
      </button>
    </div>
  );
}
