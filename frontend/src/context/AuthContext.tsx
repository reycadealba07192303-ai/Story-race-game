import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { meAPI, type AuthUser } from '../services/authApi';

export type { AuthUser };

const TOKEN_KEY = 'srg_auth_token';
const USER_KEY = 'srg_auth_user';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  setSession: (token: string, user: AuthUser) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));

  const setSession = (nextToken: string, nextUser: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
    api.defaults.headers.common.Authorization = `Bearer ${nextToken}`;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    delete api.defaults.headers.common.Authorization;
  };

  const refreshUser = async () => {
    const data = await meAPI();
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
  };

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        setLoading(false);
        return;
      }

      api.defaults.headers.common.Authorization = `Bearer ${storedToken}`;

      // If we already have a cached user, show the app immediately
      // and refresh the token in the background (so Render waking up
      // doesn't block the entire UI on mobile).
      const cachedUser = readStoredUser();
      if (cachedUser) {
        if (!cancelled) setLoading(false);
      }

      try {
        const data = await meAPI();
        if (!cancelled) {
          setUser(data.user);
          localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        }
      } catch {
        // Only log out if there was no cached user to fall back on
        if (!cancelled && !cachedUser) logout();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, setSession, logout, refreshUser }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function getRoleHomePath(role: AuthUser['role']) {
  if (role === 'admin') return '/admin';
  if (role === 'teacher') return '/teacher';
  return '/student';
}
