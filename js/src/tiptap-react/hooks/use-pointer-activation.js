import { useRef } from "react";

function preventMenuPointer(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
}

export function usePointerActivation(run) {
  const pointerHandled = useRef(false);

  return {
    onPointerDown(event) {
      preventMenuPointer(event);
      pointerHandled.current = run() !== false;
    },
    onClick(event) {
      preventMenuPointer(event);
      if (!pointerHandled.current) {
        run();
      }
      pointerHandled.current = false;
    },
    onMouseDown(event) {
      event?.preventDefault?.();
    },
    onAuxClick(event) {
      preventMenuPointer(event);
      pointerHandled.current = false;
    },
    onContextMenu(event) {
      preventMenuPointer(event);
      pointerHandled.current = false;
    },
  };
}
