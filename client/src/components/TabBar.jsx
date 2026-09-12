import { NavLink } from 'react-router-dom';
import { motion } from 'motion/react';
import { House, Cards, ChartLineUp, User } from '@phosphor-icons/react';
import { cx } from './ui.jsx';
import { SessionActionButton } from './SessionActionButton.jsx';

const TABS = [
  { to: '/home', label: 'Home', Icon: House },
  { to: '/programs', label: 'Programs', Icon: Cards },
  { to: '/progress', label: 'Progress', Icon: ChartLineUp },
  { to: '/profile', label: 'Profile', Icon: User },
];

function Tab({ to, label, Icon }) {
  return (
    <NavLink to={to} className="relative flex flex-1 flex-col items-center gap-1 py-1">
      {({ isActive }) => (
        <>
          <Icon
            size={22}
            weight={isActive ? 'fill' : 'regular'}
            className={cx('transition-colors', isActive ? 'text-ink' : 'text-ink-muted')}
          />
          <span
            className={cx(
              'text-[10px] font-semibold transition-colors',
              isActive ? 'text-ink' : 'text-ink-muted',
            )}
          >
            {label}
          </span>
          {isActive ? (
            <motion.span
              layoutId="tab-indicator"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="absolute -top-px h-[3px] w-7 rounded-pill bg-accent"
            />
          ) : null}
        </>
      )}
    </NavLink>
  );
}

/**
 * The four roots plus the raised centre action, which jumps straight to the
 * current session's plan — the same destination as the Continue Training card.
 */
export function TabBar({ actionTarget }) {
  const [left, right] = [TABS.slice(0, 2), TABS.slice(2)];

  return (
    <nav className="pointer-events-none absolute inset-x-0 bottom-0 z-30">
      <div className="pointer-events-auto relative border-t border-line bg-surface pt-2.5 pb-[calc(14px+env(safe-area-inset-bottom))]">
        <div className="flex items-end">
          {left.map((tab) => (
            <Tab key={tab.to} {...tab} />
          ))}
          <div className="w-[72px] shrink-0" aria-hidden />
          {right.map((tab) => (
            <Tab key={tab.to} {...tab} />
          ))}
        </div>

        <SessionActionButton idleTarget={actionTarget || '/programs'} />
      </div>
    </nav>
  );
}
