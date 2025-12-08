import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { UserProfileDTO } from '@/types';

/**
 * Status sesji użytkownika
 */
export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

/**
 * Stan sesji
 */
export type SessionState = {
  userId?: string;
  token?: string;
  status: SessionStatus;
};

/**
 * Wartość kontekstu Auth
 */
export type AuthContextValue = {
  user?: UserProfileDTO;
  token?: string;
  status: SessionStatus;
  isLoading: boolean;
  setUser: (user?: UserProfileDTO) => void;
  setToken: (token?: string) => void;
  resetSession: () => void;
};

/**
 * Kontekst Auth
 */
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Props dla AuthProvider
 */
type AuthProviderProps = {
  children: ReactNode;
  initialToken?: string;
};

/**
 * Provider dla kontekstu Auth
 *
 * Zarządza stanem autoryzacji użytkownika:
 * - Token JWT (z localStorage)
 * - Profil użytkownika (UserProfileDTO)
 * - Status sesji (loading/authenticated/unauthenticated)
 *
 * Token jest odczytywany z localStorage przy inicjalizacji.
 */
export function AuthProvider({ children, initialToken }: AuthProviderProps) {
  // Odczytaj token synchronicznie podczas inicjalizacji stanu
  const [token, setTokenState] = useState<string | undefined>(() => {
    if (initialToken) {
      return initialToken;
    }
    // Sprawdź localStorage tylko po stronie klienta
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token') || undefined;
    }
    return undefined;
  });

  const [user, setUser] = useState<UserProfileDTO | undefined>();
  const [status, setStatus] = useState<SessionStatus>('loading');

  /**
   * Aktualizuj status gdy zmienia się token lub user
   */
  useEffect(() => {
    if (token) {
      if (user) {
        setStatus('authenticated');
      } else {
        setStatus('loading');
      }
    } else {
      setStatus('unauthenticated');
    }
  }, [token, user]);

  /**
   * Ustawia token i zapisuje w localStorage
   */
  const setToken = (newToken?: string) => {
    setTokenState(newToken);
    if (newToken) {
      localStorage.setItem('access_token', newToken);
    } else {
      localStorage.removeItem('access_token');
    }
  };

  /**
   * Resetuje sesję - czyści token, user i localStorage
   */
  const resetSession = () => {
    setTokenState(undefined);
    setUser(undefined);
    setStatus('unauthenticated');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  };

  const value: AuthContextValue = {
    user,
    token,
    status,
    isLoading: status === 'loading',
    setUser,
    setToken,
    resetSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook do używania kontekstu Auth
 *
 * @throws Error jeśli używany poza AuthProvider
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
