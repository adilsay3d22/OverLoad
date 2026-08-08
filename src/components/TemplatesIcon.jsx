// Small original icon for the Templates entry point — a stack of cards,
// reading as "pick one from a set of pre-made options."
export default function TemplatesIcon({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="10" width="26" height="26" rx="6" fill="var(--color-bg)" stroke="var(--color-border-2)" strokeWidth="1.5" />
      <rect x="11" y="5" width="26" height="26" rx="6" fill="var(--color-surface)" stroke="var(--color-border-2)" strokeWidth="1.5" />
      <rect x="16" y="16" width="16" height="2.5" rx="1.25" fill="var(--color-accent)" />
      <rect x="16" y="21" width="16" height="2.5" rx="1.25" fill="var(--color-border-2)" />
      <rect x="16" y="26" width="10" height="2.5" rx="1.25" fill="var(--color-border-2)" />
    </svg>
  );
}
