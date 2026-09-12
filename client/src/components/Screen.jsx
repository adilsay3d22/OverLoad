import { motion } from 'motion/react';
import { cx } from './ui.jsx';
import { EASE } from '../lib/motion.js';
import { useRestTimer } from '../state/RestTimerContext.jsx';

/**
 * A screen fills the app column and owns its own scroll. Top safe padding is
 * 56px, bottom is 40px — or 108px when the tab bar is present.
 */
export function Screen({
  children,
  // The tab bar is on every signed-in screen now, so clearing it is the default.
  tabBar = true,
  dark = false,
  padded = true,
  className,
  contentClassName,
  scrollRef,
}) {
  // The mini rest timer floats over every screen, so each one opens up enough
  // room at the top that its header is not sitting underneath the pill.
  const timer = useRestTimer();
  const miniVisible = timer.active && timer.presentation === 'mini';

  return (
    <div
      className={cx(
        'relative flex h-full min-h-0 flex-col',
        dark ? 'bg-dark-bg text-white' : 'bg-bg',
        className,
      )}
    >
      <div
        ref={scrollRef}
        className={cx(
          'no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain',
          padded && 'screen-pad',
          contentClassName,
        )}
        style={{
          paddingTop: `calc(${miniVisible ? 112 : 56}px + env(safe-area-inset-top))`,
          paddingBottom: tabBar ? 108 : 40,
        }}
      >
        {children}
      </div>
    </div>
  );
}

const transition = { duration: 0.24, ease: EASE };

/** Staggered waterfall for a screen's stacked sections. */
export function Stagger({ children, className, gap = 22 }) {
  return (
    <motion.div
      className={cx('flex flex-col', className)}
      style={{ gap }}
      initial="hidden"
      animate="shown"
      variants={{ shown: { transition: { staggerChildren: 0.05 } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className, ...rest }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 14 },
        shown: { opacity: 1, y: 0, transition },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Screen title block: caps + 30px/700 heading. */
export function ScreenHeader({ overline, title, trailing, children, className }) {
  return (
    <header className={cx('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        {overline ? <div className="caps mb-1.5">{overline}</div> : null}
        <h1 className="text-[30px] leading-[1.1] font-bold tracking-[-0.03em] text-balance">
          {title}
        </h1>
        {children}
      </div>
      {trailing}
    </header>
  );
}
