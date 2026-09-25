import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../utils/supabaseClient';

export interface UserPermissions {
  role: 'admin' | 'user';
  can_read_token_wallet: boolean;
  can_edit_token_wallet: boolean;
  can_read_payments: boolean;
  can_edit_payments: boolean;
  can_read_app_wallet: boolean;
  can_edit_app_wallet: boolean;
}

const DEFAULT_USER_PERMISSIONS: UserPermissions = {
  role: 'user',
  can_read_token_wallet: false,
  can_edit_token_wallet: false,
  can_read_payments: false,
  can_edit_payments: false,
  can_read_app_wallet: true,
  can_edit_app_wallet: false,
};

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  permissions: UserPermissions | null;
  isAdmin: boolean;
  isAuthLoading: boolean;
  githubToken: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  disconnectGitHub: () => void;
  signOut: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [githubToken, setGithubToken] = useState<string | null>(
    localStorage.getItem('github_token')
  );

  async function loadPermissions(userId: string, email: string) {
    const isOwnerAdmin = email.toLowerCase() === 'hoang.hoa@gmail.com';

    // Always upsert with unprivileged defaults so RLS "self register unprivileged" policy passes.
    // Owner admin privilege is enforced client-side after reading the DB row.
    const registerRow = {
      user_id: userId,
      email,
      role: 'user',
      can_read_token_wallet: false,
      can_edit_token_wallet: false,
      can_read_payments: false,
      can_edit_payments: false,
      can_read_app_wallet: true,
      can_edit_app_wallet: false,
    };

    // Try to register user identity safely (INSERT only if not exists)
    try {
      await supabase
        .from('aw_user_permissions')
        .upsert(registerRow, { onConflict: 'user_id', ignoreDuplicates: true });
    } catch (err) {
      console.warn('permission row upsert failed', err);
    }

    // Read permissions row from DB
    const { data } = await supabase
      .from('aw_user_permissions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (isOwnerAdmin || data?.role === 'admin') {
      setPermissions({
        role: 'admin',
        can_read_token_wallet: true,
        can_edit_token_wallet: true,
        can_read_payments: true,
        can_edit_payments: true,
        can_read_app_wallet: true,
        can_edit_app_wallet: true,
      });
    } else if (data) {
      setPermissions({
        role: data.role,
        can_read_token_wallet: Boolean(data.can_read_token_wallet),
        can_edit_token_wallet: Boolean(data.can_edit_token_wallet),
        can_read_payments: Boolean(data.can_read_payments),
        can_edit_payments: Boolean(data.can_edit_payments),
        can_read_app_wallet: Boolean(data.can_read_app_wallet),
        can_edit_app_wallet: Boolean(data.can_edit_app_wallet),
      });
    } else {
      setPermissions(DEFAULT_USER_PERMISSIONS);
    }
  }

  async function refreshPermissions() {
    if (session?.user) {
      await loadPermissions(session.user.id, session.user.email ?? '');
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.provider_token) {
        localStorage.setItem('github_token', s.provider_token);
        setGithubToken(s.provider_token);
      }
      if (s?.user) {
        loadPermissions(s.user.id, s.user.email ?? '').finally(() =>
          setIsAuthLoading(false)
        );
      } else {
        setIsAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.provider_token) {
        localStorage.setItem('github_token', s.provider_token);
        setGithubToken(s.provider_token);
      }
      if (s?.user) {
        loadPermissions(s.user.id, s.user.email ?? '');
      } else {
        setPermissions(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  }

  async function signInWithGitHub() {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        scopes: 'repo read:user',
        redirectTo: window.location.origin,
      },
    });
  }

  function disconnectGitHub() {
    localStorage.removeItem('github_token');
    setGithubToken(null);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setPermissions(null);
  }

  const user = session?.user ?? null;
  const isAdmin = permissions?.role === 'admin';

  return (
    <AuthContext.Provider value={{
      session, user, permissions, isAdmin, isAuthLoading, githubToken,
      signInWithGoogle, signInWithGitHub, disconnectGitHub, signOut, refreshPermissions,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
