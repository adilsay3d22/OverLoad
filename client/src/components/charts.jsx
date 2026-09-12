import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ACCENT, INK } from '../lib/tokens.js';
import { cx } from './ui.jsx';
import { EASE } from '../lib/motion.js';

/** Width of an element, tracked so charts render text at true pixel size. */
export function useMeasure() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(node);
    setWidth(node.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

const niceTicks = (min, max, count = 3) => {
  if (max === min) return [min];
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, i) => min + step * i);
};

/**
 * The one line chart in the app: accent stroke, gradient fill, hollow points,
 * and a callout bubble pinned to the most recent value.
 */
export function LineChart({
  points,
  labels,
  unit = '',
  height = 150,
  formatValue = (v) => `${Math.round(v * 10) / 10}${unit}`,
  className,
  stroke = INK,
}) {
  const [ref, width] = useMeasure();
  const gradientId = useId();

  if (!points?.length) return <div ref={ref} className={className} style={{ height }} />;

  const padL = 30;
  const padR = 16;
  const padT = 34;
  const padB = 24;
  const w = Math.max(width, 220);
  const innerW = w - padL - padR;
  const innerH = height - padT - padB;

  const values = points.map((p) => (typeof p === 'number' ? p : p.value));
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const pad = (rawMax - rawMin) * 0.18 || Math.max(rawMax * 0.12, 1);
  const min = Math.max(0, rawMin - pad);
  const max = rawMax + pad;

  const x = (i) => padL + (values.length === 1 ? innerW / 2 : (innerW * i) / (values.length - 1));
  const y = (v) => padT + innerH - ((v - min) / (max - min || 1)) * innerH;

  const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ');
  const area = `${line} L${x(values.length - 1)},${padT + innerH} L${x(0)},${padT + innerH} Z`;
  const lastIndex = values.length - 1;
  const callout = formatValue(values[lastIndex]);
  const calloutW = callout.length * 6.6 + 18;

  return (
    <div ref={ref} className={cx('w-full', className)}>
      {width > 0 ? (
        <svg width={w} height={height} role="img" aria-label={`Trend ending at ${callout}`}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>

          {niceTicks(min, max).map((tick) => (
            <text
              key={tick}
              x={padL - 8}
              y={y(tick) + 3.5}
              textAnchor="end"
              fontSize="10"
              fontWeight="500"
              fill="var(--color-ink-faint)"
            >
              {Math.round(tick * 10) / 10}
            </text>
          ))}

          <motion.path
            d={area}
            fill={`url(#${gradientId})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          />
          <motion.path
            d={line}
            fill="none"
            stroke={stroke}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, ease: EASE }}
          />

          <line
            x1={x(lastIndex)}
            y1={y(values[lastIndex]) + 6}
            x2={x(lastIndex)}
            y2={padT + innerH}
            stroke="var(--color-line-strong)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />

          {values.map((v, i) =>
            i === lastIndex ? null : (
              <circle
                key={i}
                cx={x(i)}
                cy={y(v)}
                r="4"
                fill="var(--color-surface)"
                stroke={stroke}
                strokeWidth="2"
              />
            ),
          )}
          <circle cx={x(lastIndex)} cy={y(values[lastIndex])} r="4.5" fill={stroke} />

          <g
            transform={`translate(${Math.min(
              Math.max(x(lastIndex) - calloutW / 2, padL - 8),
              w - calloutW - 2,
            )}, ${Math.max(y(values[lastIndex]) - 32, 2)})`}
          >
            <rect width={calloutW} height="22" rx="10" fill="var(--color-ink)" />
            <text
              x={calloutW / 2}
              y="15"
              textAnchor="middle"
              fontSize="11"
              fontWeight="700"
              fill="#fff"
            >
              {callout}
            </text>
          </g>

          {labels?.map((label, i) => (
            <text
              key={`${label}-${i}`}
              x={x(i)}
              y={height - 6}
              textAnchor="middle"
              fontSize="10"
              fontWeight="500"
              fill="var(--color-ink-faint)"
            >
              {label}
            </text>
          ))}
        </svg>
      ) : null}
    </div>
  );
}

/** Tiny trend line for the Exercise Progress list rows. */
export function Sparkline({ values, width = 58, height = 24, className, stroke = INK }) {
  if (!values?.length) {
    return (
      <svg width={width} height={height} className={className} aria-hidden>
        <line
          x1="2"
          y1={height / 2}
          x2={width - 2}
          y2={height / 2}
          stroke="var(--color-line-strong)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const x = (i) => 2 + ((width - 4) * i) / Math.max(1, values.length - 1);
  const y = (v) => height - 3 - ((v - min) / (max - min || 1)) * (height - 6);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ');
  return (
    <svg width={width} height={height} className={className} aria-hidden>
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r="2.5" fill={stroke} />
    </svg>
  );
}

/** Percentage ring — Overall Progress and the rest-timer countdown. */
export function ProgressRing({
  value,
  size = 148,
  stroke = 14,
  track = 'var(--color-line)',
  color = ACCENT,
  children,
  className,
  animate = true,
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));

  return (
    <div className={cx('relative', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={animate ? { strokeDashoffset: circumference } : false}
          animate={{ strokeDashoffset: circumference * (1 - clamped) }}
          transition={animate ? { type: 'spring', stiffness: 60, damping: 18 } : { duration: 0 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

/** Horizontal share bars for Muscle Group Balance. */
export function BalanceBar({ percent, color, delay = 0 }) {
  return (
    <div className="h-[9px] flex-1 overflow-hidden rounded-pill bg-line">
      <motion.div
        className="h-full rounded-pill"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${percent}%` }}
        transition={{ type: 'spring', stiffness: 90, damping: 20, delay }}
      />
    </div>
  );
}

/** Used by the rest-timer takeover, where the ring needs a live glow. */
export function useNow(active, interval = 250) {
  const [, force] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => force((n) => n + 1), interval);
    return () => clearInterval(id);
  }, [active, interval]);
}
