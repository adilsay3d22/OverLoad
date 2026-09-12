import { useEffect, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { Check, Trash, X } from '@phosphor-icons/react';
import { cx } from './ui.jsx';

/**
 * Expand-to-confirm destructive button.
 *
 * Ported from the shadcn `NativeDelete` component: same interaction and motion,
 * rebuilt on this app's own primitives. It is not a shadcn project — there is no
 * `cn`, CVA, Radix Slot or lucide here — so the port uses `cx`, the Phosphor set
 * every other screen draws from, and the palette's own `#B8401F` destructive
 * colour instead of a `bg-destructive` token that does not exist.
 *
 * `onDelete` may return a promise; the button holds its expanded state and shows
 * `pendingText` until that settles, which a real network call needs.
 */

const sizeVariants = {
  sm: 'h-8 text-xs px-3',
  md: 'h-10 text-sm px-4',
  lg: 'h-12 text-base px-6',
};

const iconSizeVariants = { sm: 14, md: 16, lg: 20 };

const cancelButtonSizes = {
  sm: 'size-8',
  md: 'size-10',
  lg: 'size-12',
};

/** Smooth spring preset for a natural feel. */
const smoothSpring = { type: 'spring', bounce: 0, duration: 0.35 };

export function DeleteButton({
  onConfirm,
  onDelete,
  buttonText = 'Delete',
  confirmText = 'Confirm',
  pendingText = 'Working…',
  size = 'md',
  showIcon = true,
  className,
  disabled = false,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [pending, setPending] = useState(false);
  // Armed a beat after expanding, so a fast double-tap cannot confirm what the
  // first tap only proposed.
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!isExpanded) {
      setArmed(false);
      return undefined;
    }
    const id = setTimeout(() => setArmed(true), 450);
    return () => clearTimeout(id);
  }, [isExpanded]);

  const locked = disabled || pending || (isExpanded && !armed);

  const handleDeleteClick = () => {
    if (disabled || pending) return;
    setIsExpanded(true);
    onConfirm?.();
  };

  const handleConfirm = async () => {
    if (pending || !armed) return;
    setPending(true);
    try {
      await onDelete();
      setIsExpanded(false);
    } finally {
      setPending(false);
    }
  };

  const handleCancel = () => setIsExpanded(false);

  const label = pending ? pendingText : isExpanded ? confirmText : buttonText;

  return (
    <MotionConfig transition={smoothSpring}>
      <motion.div layout className={cx('relative inline-flex items-center gap-2', className)}>
        <span role="status" aria-live="assertive" className="sr-only">
          {pending
            ? pendingText
            : isExpanded
              ? `${confirmText}. This cannot be undone. Press again to confirm, or cancel.`
              : ''}
        </span>
        <motion.div
          layout
          whileHover={!locked ? { scale: 1.02 } : undefined}
          whileTap={!locked ? { scale: 0.98 } : undefined}
        >
          <button
            type="button"
            onClick={isExpanded ? handleConfirm : handleDeleteClick}
            disabled={locked}
            aria-label={label}
            className={cx(
              sizeVariants[size],
              'inline-flex items-center justify-center rounded-pill bg-danger font-bold whitespace-nowrap text-white transition-[background-color,box-shadow] hover:bg-danger-hover',
              locked && 'cursor-not-allowed opacity-60',
            )}
          >
            {showIcon ? (
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={isExpanded ? 'check-icon' : 'trash-icon'}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  className="mr-2 flex items-center"
                >
                  {isExpanded ? (
                    <Check size={iconSizeVariants[size]} weight="bold" />
                  ) : (
                    <Trash size={iconSizeVariants[size]} weight="bold" />
                  )}
                </motion.span>
              </AnimatePresence>
            ) : null}

            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={label}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
              >
                {label}
              </motion.span>
            </AnimatePresence>
          </button>
        </motion.div>

        <AnimatePresence mode="popLayout">
          {isExpanded ? (
            <motion.div
              key="cancel-button"
              layout
              initial={{ opacity: 0, scale: 0.8, x: -8 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: -8 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <button
                type="button"
                onClick={handleCancel}
                disabled={pending}
                aria-label="Cancel"
                className={cx(
                  cancelButtonSizes[size],
                  'inline-flex items-center justify-center rounded-pill border border-line bg-surface text-ink transition-colors hover:bg-accent-wash disabled:opacity-50',
                )}
              >
                <X size={iconSizeVariants[size]} weight="bold" />
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </MotionConfig>
  );
}
