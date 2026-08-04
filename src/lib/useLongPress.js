import { useCallback, useRef } from 'react';

// Detects a long-press vs a normal tap on the same element. If the press
// is held past `ms`, onLongPress fires and the resulting click is
// swallowed (so it doesn't also trigger navigation). Otherwise it behaves
// like a normal click.
export function useLongPress(onLongPress, onClick, ms = 500) {
  const timerRef = useRef(null);
  const firedRef = useRef(false);

  const start = useCallback(() => {
    firedRef.current = false;
    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      onLongPress();
    }, ms);
  }, [onLongPress, ms]);

  const clear = useCallback(() => {
    clearTimeout(timerRef.current);
  }, []);

  const handleClick = useCallback((e) => {
    if (firedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      firedRef.current = false;
      return;
    }
    onClick?.(e);
  }, [onClick]);

  return {
    onPointerDown: start,
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onContextMenu: (e) => e.preventDefault(),
    onClick: handleClick,
  };
}
