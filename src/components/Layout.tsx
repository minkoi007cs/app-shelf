import { Suspense, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import SettingsModal from './SettingsModal';
import { applyTheme } from '../utils/theme';
import { useAuth } from '../contexts/AuthContext';
import { WalletIcon, SettingsIcon, GoogleIcon } from './icons';

export default function Layout() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { user, isAdmin, signInWithGoogle, signOut, isAuthLoading } = useAuth();

  useEffect(() => {
    const savedTheme = localStorage.getItem('app_theme') || 'dark';
    applyTheme(savedTheme);
  }, []);

  const avatarLetter = user?.email?.charAt(0).toUpperCase() ?? '';
  const displayName = user?.user_metadata?.full_name ?? user?.email ?? '';

  return (
    <div className="app-wrapper">
      <header>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <WalletIcon />
            <span>App Shelf</span>
          </h1>
        </div>
        <div className="header-actions">
          <button
            id="settings-btn"
            className="btn"
            onClick={() => setIsSettingsOpen(true)}
            title="Settings"
          >
            <SettingsIcon />
            Settings
          </button>

          {!isAuthLoading && (
            user ? (
              <div className="auth-user-chip">
                <div className="auth-avatar" title={displayName}>
                  {user.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt={avatarLetter} className="auth-avatar-img" />
                  ) : (
                    <span>{avatarLetter}</span>
                  )}
                  {isAdmin && <span className="auth-crown" title="Admin">👑</span>}
                </div>
                <span className="auth-name">{displayName}</span>
                <button className="btn btn-signout" onClick={signOut} title="Sign Out">
                  ↩
                </button>
              </div>
            ) : (
              <button className="btn btn-google-small" onClick={signInWithGoogle}>
                <GoogleIcon />
                Sign In
              </button>
            )
          )}
        </div>
      </header>

      <Suspense fallback={<div className="protected-spinner">Loading page...</div>}>
        <Outlet />
      </Suspense>

      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
    </div>
  );
}
