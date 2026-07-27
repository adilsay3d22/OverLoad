import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function TopBar({ back }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between pt-safe px-5 pb-3 shrink-0">
      {back ? (
        <button
          className="w-9 h-9 rounded-[10px] bg-surface border border-border text-text-2
                     text-base flex items-center justify-center"
          onClick={() => navigate(back)}
          aria-label="Go back"
        >
          ←
        </button>
      ) : (
        <span className="font-display text-[15px] font-extrabold tracking-[2px] text-text">
          OVERLOAD
        </span>
      )}

      {user && (
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs text-text-2 tracking-[0.3px] max-w-[120px] truncate">
            {user.name}
          </span>
          <button
            className="h-8 px-3 rounded-lg bg-surface border border-border text-[11px]
                       font-bold tracking-wide uppercase text-text-2 active:bg-bg-2"
            onClick={logout}
          >
            Log out
          </button>
        </div>
      )}
    </header>
  );
}
