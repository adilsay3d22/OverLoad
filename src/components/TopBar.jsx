import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './TopBar.css';

export default function TopBar({ back }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="topbar">
      {back ? (
        <button className="topbar-back" onClick={() => navigate(back)} aria-label="Go back">
          ←
        </button>
      ) : (
        <span className="topbar-mark">OVERLOAD</span>
      )}

      {user && (
        <div className="topbar-user">
          <span className="topbar-name">{user.name}</span>
          <button className="topbar-logout" onClick={logout}>Log out</button>
        </div>
      )}
    </header>
  );
}
