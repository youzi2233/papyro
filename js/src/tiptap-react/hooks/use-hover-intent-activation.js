import { useCallback, useEffect, useRef } from "react";

const DEFAULT_HOVER_INTENT_DELAY_MS = 80;

export function useHoverIntentActivation({
  activate,
  delay = DEFAULT_HOVER_INTENT_DELAY_MS,
} = {}) {
  const activateRef = useRef(activate);
  const timerRef = useRef(null);

  activateRef.current = activate;

  const cancel = useCallback(() => {
    if (timerRef.current == null) return;
    globalThis.clearTimeout?.(timerRef.current);
    timerRef.current = null;
  }, []);

  const schedule = useCallback(
    (index, options = {}) => {
      cancel();
      if (typeof globalThis.setTimeout !== "function") {
        activateRef.current?.(index, options);
        return;
      }
      timerRef.current = globalThis.setTimeout(() => {
        timerRef.current = null;
        activateRef.current?.(index, options);
      }, delay);
    },
    [cancel, delay],
  );

  const runNow = useCallback(
    (index, options = {}) => {
      cancel();
      activateRef.current?.(index, options);
    },
    [cancel],
  );

  useEffect(() => cancel, [cancel]);

  return { schedule, runNow, cancel };
}
