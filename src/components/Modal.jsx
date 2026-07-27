import { useEffect } from 'react';

export default function Modal({ onClose, children, labelledBy }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center
                 bg-black/45 backdrop-blur-[2px] p-4 [animation:scrimIn_0.2s_ease_both]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-[400px] bg-surface border border-border rounded-[20px]
                   p-6 px-5 pb-safe [animation:cardUp_0.25s_cubic-bezier(0.4,0,0.2,1)_both]"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        {children}
      </div>
    </div>
  );
}
