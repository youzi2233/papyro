import React, { useCallback, useMemo, useRef } from "react";
import { DragHandle } from "@tiptap/extension-drag-handle-react";

import { createPapyroOfficialDragHandleConfig } from "../tiptap-official-drag-handle.js";
import { PapyroBlockHandle } from "./components/block-handle.jsx";
import { officialDragHandleBridgeState } from "./official-drag-handle-bridge-state.js";

export function PapyroOfficialDragHandleBridge({ editor, entry = null }) {
  const config = useMemo(() => createPapyroOfficialDragHandleConfig(), []);
  const bridgeState = officialDragHandleBridgeState({ editor, entry });
  const entryRef = useRef(entry);
  entryRef.current = entry;
  const handleNodeChange = useCallback((data) => {
    entryRef.current?.blockHandle?.handleOfficialNodeChange?.(data);
  }, []);
  const handleElementDragEnd = useCallback(() => {
    entryRef.current?.blockHandle?.cancelDrag?.();
  }, []);
  const openActionsFromBridge = useCallback((event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    entryRef.current?.blockHandle?.clickAction?.(event);
  }, []);
  const openContextActionsFromBridge = useCallback((event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    entryRef.current?.blockHandle?.openActions?.(event);
  }, []);
  const ignoreAuxActionFromBridge = useCallback((event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
  }, []);
  const allowOfficialDragFromBridge = useCallback((event) => {
    if (event?.button === 2) {
      openContextActionsFromBridge(event);
    }
  }, [openContextActionsFromBridge]);
  const handleState = entry?.blockHandle?.viewState ?? null;
  const hidden =
    !handleState?.open ||
    !handleState?.target ||
    handleState?.floatingViewHidden === true;

  if (!bridgeState.active) return null;

  return (
    <DragHandle
      editor={editor}
      pluginKey={config.pluginKey}
      computePositionConfig={config.computePositionConfig}
      nested={config.nested}
      className="mn-tiptap-official-drag-handle-bridge"
      onNodeChange={handleNodeChange}
      onElementDragEnd={handleElementDragEnd}
    >
      <PapyroBlockHandle
        state={{
          ...(handleState ?? {}),
          hidden,
          onActionPointerDown: allowOfficialDragFromBridge,
          onActionPointerUp: undefined,
          onActionClick: openActionsFromBridge,
          onActionContextMenu: openContextActionsFromBridge,
          onAuxClick: ignoreAuxActionFromBridge,
          rootProps: {
            "data-view-mode": bridgeState.viewMode,
            "data-state": bridgeState.reason,
          },
        }}
      />
    </DragHandle>
  );
}
