import { useRef } from "react";

type PointerActivationEvent = {
  preventDefault?: () => void;
  stopPropagation?: () => void;
  nativeEvent?: {
    stopImmediatePropagation?: () => void;
  };
};

function preventMenuPointer(event: PointerActivationEvent | null | undefined) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  event?.nativeEvent?.stopImmediatePropagation?.();
}

export function usePointerActivation(run: () => void) {
  const pointerActivated = useRef(false);

  return {
    onPointerDown(event: PointerActivationEvent) {
      preventMenuPointer(event);
      pointerActivated.current = true;
      run();
    },
    onClick(event: PointerActivationEvent) {
      preventMenuPointer(event);
      if (!pointerActivated.current) {
        run();
      }
      pointerActivated.current = false;
    },
    onMouseDown(event: PointerActivationEvent) {
      preventMenuPointer(event);
    },
    onAuxClick(event: PointerActivationEvent) {
      preventMenuPointer(event);
      pointerActivated.current = false;
    },
    onContextMenu(event: PointerActivationEvent) {
      preventMenuPointer(event);
      pointerActivated.current = false;
    },
  };
}
