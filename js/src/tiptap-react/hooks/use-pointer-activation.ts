import { useRef } from "react";
import type {
  MouseEventHandler,
  PointerEventHandler,
  SyntheticEvent,
} from "react";

type PointerActivationEvent<T extends HTMLElement> = SyntheticEvent<T> & {
  nativeEvent: Event & {
    stopImmediatePropagation?: () => void;
  };
};

function preventMenuPointer<T extends HTMLElement>(
  event: PointerActivationEvent<T> | null | undefined,
) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  event?.nativeEvent?.stopImmediatePropagation?.();
}

export function usePointerActivation<T extends HTMLElement = HTMLElement>(run: () => void): {
  onPointerDown: PointerEventHandler<T>;
  onClick: MouseEventHandler<T>;
  onMouseDown: MouseEventHandler<T>;
  onAuxClick: MouseEventHandler<T>;
  onContextMenu: MouseEventHandler<T>;
} {
  const pointerActivated = useRef(false);

  return {
    onPointerDown(event) {
      preventMenuPointer(event);
      pointerActivated.current = true;
      run();
    },
    onClick(event) {
      preventMenuPointer(event);
      if (!pointerActivated.current) {
        run();
      }
      pointerActivated.current = false;
    },
    onMouseDown(event) {
      preventMenuPointer(event);
    },
    onAuxClick(event) {
      preventMenuPointer(event);
      pointerActivated.current = false;
    },
    onContextMenu(event) {
      preventMenuPointer(event);
      pointerActivated.current = false;
    },
  };
}
