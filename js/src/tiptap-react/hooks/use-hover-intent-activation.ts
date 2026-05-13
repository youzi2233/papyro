import { useCallback, useEffect, useRef } from "react";

const DEFAULT_HOVER_INTENT_DELAY_MS = 80;

type HoverIntentOptions = Record<string, unknown>;

type HoverIntentActivate = (
  index: number,
  options?: HoverIntentOptions,
) => void;

export function useHoverIntentActivation({
  activate,
  delay = DEFAULT_HOVER_INTENT_DELAY_MS,
}: { activate?: HoverIntentActivate; delay?: number } = {}) {
  const activateRef = useRef(activate);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  activateRef.current = activate;

  const cancel = useCallback(() => {
    if (timerRef.current == null) return;
    globalThis.clearTimeout?.(timerRef.current);
    timerRef.current = null;
  }, []);

  const schedule = useCallback(
    (index: number, options: HoverIntentOptions = {}) => {
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
    (index: number, options: HoverIntentOptions = {}) => {
      cancel();
      activateRef.current?.(index, options);
    },
    [cancel],
  );

  useEffect(() => cancel, [cancel]);

  return { schedule, runNow, cancel };
}
