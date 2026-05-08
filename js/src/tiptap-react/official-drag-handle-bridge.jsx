import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DragHandle } from "@tiptap/extension-drag-handle-react";

import { createPapyroOfficialDragHandleConfig } from "../tiptap-official-drag-handle.js";
import { PapyroBlockHandle } from "./components/block-handle.jsx";
import {
  createOfficialDragHandleClickTracker,
  officialDragHandleBridgeState,
  officialDragHandleControlsHidden,
} from "./official-drag-handle-bridge-state.js";

function useBlockHandleViewState(entry) {
  const blockHandle = entry?.blockHandle ?? null;
  const [handleState, setHandleState] = useState(
    () => blockHandle?.viewState ?? null,
  );

  useEffect(() => {
    if (!blockHandle) {
      setHandleState(null);
      return undefined;
    }

    if (typeof blockHandle.subscribeViewState !== "function") {
      setHandleState(blockHandle.viewState ?? null);
      return undefined;
    }

    return blockHandle.subscribeViewState(setHandleState);
  }, [blockHandle]);

  return handleState;
}

export function PapyroOfficialDragHandleBridge({ editor, entry = null }) {
  const config = useMemo(() => createPapyroOfficialDragHandleConfig(), []);
  const bridgeState = officialDragHandleBridgeState({ editor, entry });
  const handleState = useBlockHandleViewState(entry);
  const entryRef = useRef(entry);
  const clickTrackerRef = useRef(createOfficialDragHandleClickTracker());
  entryRef.current = entry;
  const handleNodeChange = useCallback((data) => {
    entryRef.current?.blockHandle?.handleOfficialNodeChange?.(data);
  }, []);
  const handleElementDragEnd = useCallback(() => {
    clickTrackerRef.current.cancel();
    entryRef.current?.blockHandle?.finishOfficialNativeDrag?.();
    entryRef.current?.blockHandle?.cancelDrag?.();
  }, []);
  const handleElementDragStart = useCallback((event) => {
    entryRef.current?.blockHandle?.startOfficialNativeDrag?.(event);
  }, []);
  const openActionsFromBridge = useCallback((event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    entryRef.current?.blockHandle?.clickAction?.(event);
  }, []);
  const openActionsFromBridgeClick = useCallback((event) => {
    if (clickTrackerRef.current.click()) {
      openActionsFromBridge(event);
    } else {
      event?.preventDefault?.();
      event?.stopPropagation?.();
    }
  }, [openActionsFromBridge]);
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
    clickTrackerRef.current.begin(event);
    if (event?.button === 2) {
      openContextActionsFromBridge(event);
    }
  }, [openContextActionsFromBridge]);
  const openActionsFromBridgePointerUp = useCallback((event) => {
    if (clickTrackerRef.current.end(event)) {
      openActionsFromBridge(event);
    }
  }, [openActionsFromBridge]);
  const hidden = officialDragHandleControlsHidden(handleState);

  if (!bridgeState.active) return null;

  return (
    <DragHandle
      editor={editor}
      pluginKey={config.pluginKey}
      computePositionConfig={config.computePositionConfig}
      nested={config.nested}
      className="mn-tiptap-official-drag-handle-bridge"
      onNodeChange={handleNodeChange}
      onElementDragStart={handleElementDragStart}
      onElementDragEnd={handleElementDragEnd}
    >
      <PapyroBlockHandle
        state={{
          ...(handleState ?? {}),
          hidden,
          onActionPointerDown: allowOfficialDragFromBridge,
          onActionPointerUp: openActionsFromBridgePointerUp,
          onActionClick: openActionsFromBridgeClick,
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
