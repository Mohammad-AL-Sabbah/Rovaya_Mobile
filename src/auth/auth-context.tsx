import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  clearSession,
  isTokenExpired,
  loadSession,
  login,
  saveSession,
  setAccessToken,
  setUnauthorizedHandler,
  type AuthUser,
} from '@/api';

type Status = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: Status;
  user: AuthUser | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);








export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

  const signOut = useCallback(async () => {
    setAccessToken(null);
    setUser(null);
    setStatus('unauthenticated');
    try {
      await clearSession();
    } catch {
      // لا شيء
    }
  }, []);

  // أي طلب محمي يرجع 401 → نُنهي الجلسة (الراوتر يعيد المستخدم لصفحة الترحيب تلقائياً)
  useEffect(() => {
    setUnauthorizedHandler(() => {
      void signOut();
    });
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  // استعادة الجلسة المحفوظة عند فتح التطبيق
  useEffect(() => {
    (async () => {
      try {
        const session = await loadSession();
        if (session && !isTokenExpired(session.token)) {
          setAccessToken(session.token);
          setUser(session.user);
          setStatus('authenticated');
          return;
        }
        if (session) await clearSession();
      } catch (error) {
        console.warn('[auth] failed to restore session', error);
      }
      setStatus('unauthenticated');
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { token, user: nextUser } = await login({ email, password });
    try {
      await saveSession(token, nextUser);
    } catch (error) {
      console.warn('[auth] could not persist session', error);
    }
    setAccessToken(token);
    setUser(nextUser);
    setStatus('authenticated');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isAuthenticated: status === 'authenticated',
      signIn,
      signOut,
      hasRole: (role) => !!user?.roles.includes(role),
    }),
    [status, user, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

