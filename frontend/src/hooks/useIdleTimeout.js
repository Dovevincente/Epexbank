import { useEffect, useRef, useCallback } from "react";

const DEFAULT_IDLE_TIMEOUT = 2 * 60 * 1000; // 2 minutes

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "click",
];

export default function useIdleTimeout({
  onIdle,
  timeout = DEFAULT_IDLE_TIMEOUT,
  enabled = true,
}) {
  const timerRef = useRef(null);
  const onIdleRef = useRef(onIdle);
  const hasLoggedOutRef = useRef(false);

  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  const resetTimer = useCallback(() => {
    if (!enabled || hasLoggedOutRef.current) {
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      hasLoggedOutRef.current = true;
      onIdleRef.current?.();
    }, timeout);
  }, [enabled, timeout]);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      return undefined;
    }

    hasLoggedOutRef.current = false;

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, resetTimer, {
        passive: true,
      });
    });

    // Start the inactivity countdown.
    resetTimer();

    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [enabled, resetTimer]);

  return { resetTimer };
}