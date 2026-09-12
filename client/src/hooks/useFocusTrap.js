import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Keep focus inside an open overlay, and give it back on close.
 *
 * `aria-modal="true"` tells assistive technology that everything outside the
 * dialog is hidden. If focus is still sitting on the button that opened it —
 * which is what happens by default — a screen-reader user is parked on an
 * element their own software has just been told does not exist, with no way
 * back. Declaring the attribute without doing this is worse than not declaring
 * it at all.
 *
 * Returns a ref to put on the dialog element.
 */
export function useFocusTrap(open) {
  const ref = useRef(null);
  const restoreTo = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    restoreTo.current = document.activeElement;
    const node = ref.current;
    if (!node) return undefined;

    // Focus the first real control, or the dialog itself so the label is read.
    const first = node.querySelector(FOCUSABLE);
    if (first) first.focus();
    else {
      node.setAttribute('tabindex', '-1');
      node.focus();
    }

    const onKey = (e) => {
      if (e.key !== 'Tab') return;
      const items = [...node.querySelectorAll(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (!items.length) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    };

    node.addEventListener('keydown', onKey);
    return () => {
      node.removeEventListener('keydown', onKey);
      // Give focus back to whatever opened this, so the user is where they left.
      const target = restoreTo.current;
      if (target && typeof target.focus === 'function' && document.contains(target)) {
        target.focus();
      }
    };
  }, [open]);

  return ref;
}
