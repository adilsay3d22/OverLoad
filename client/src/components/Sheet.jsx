import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cx } from './ui.jsx';
import { useFocusTrap } from '../hooks/useFocusTrap.js';

/** Bottom sheet used for action menus and the add-exercise flow. */
export function Sheet({ open, onClose, title, subtitle, children, full = false }) {
  const trapRef = useFocusTrap(open);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="absolute inset-0 z-40 flex flex-col justify-end">
          <motion.button
            aria-label="Close"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[rgba(20,21,15,0.34)]"
          />
          <motion.div
            ref={trapRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className={cx(
              // `text-ink` is not decoration: the sheet also opens over the
              // dark rest takeover, which sets `text-white` on its root. Without
              // an explicit colour here every label in the sheet inherited white
              // and the panel rendered as a blank white card.
              'relative flex min-h-0 flex-col rounded-t-[30px] bg-bg text-ink pb-[calc(22px+env(safe-area-inset-bottom))]',
              full ? 'h-[86%]' : 'max-h-[80%]',
            )}
          >
            <div className="flex justify-center pt-3 pb-1">
              <span className="h-1 w-10 rounded-pill bg-line-strong" aria-hidden />
            </div>
            {title ? (
              <div className="px-[22px] pt-2 pb-3.5">
                <h2 className="text-[20px] font-semibold tracking-[-0.02em]">{title}</h2>
                {subtitle ? (
                  <p className="mt-1 text-[13px] font-medium text-ink-muted">{subtitle}</p>
                ) : null}
              </div>
            ) : null}
            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-[22px] pb-2">
              {children}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

/** A row inside an action sheet. */
export function SheetAction({ icon, label, description, tone = 'default', ...rest }) {
  return (
    <button
      className={cx(
        'press flex w-full items-center gap-3.5 rounded-row border border-line bg-surface p-4 text-left hover:bg-accent-wash',
        // Without this a disabled action looks identical to a live one, so it
        // reads as a button that simply does nothing when tapped.
        'disabled:pointer-events-none disabled:opacity-45',
        tone === 'danger' && 'text-danger',
      )}
      {...rest}
    >
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-[12px] font-medium text-ink-muted">{description}</span>
        ) : null}
      </span>
    </button>
  );
}
