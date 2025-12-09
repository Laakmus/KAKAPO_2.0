import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

/**
 * Opcje dla useProtectedRoute
 */
export type ProtectedRouteOptions = {
  redirectPath?: string;
  onError?: (error: Error) => void;
};

/**
 * Stan chronionej trasy
 */
export type ProtectedRouteState = {
  status: 'loading' | 'ready' | 'redirect';
  isReady: boolean;
};

/**
 * Hook useProtectedRoute
 *
 * Sprawdza czy użytkownik ma dostęp do chronionej trasy:
 * - Weryfikuje obecność tokena
 * - Sprawdza czy profil jest załadowany
 * - Przekierowuje na /login jeśli brak autoryzacji
 * - Wyświetla toast z komunikatem
 *
 * Używany w AuthenticatedLayout lub innych komponentach chronionych tras.
 *
 * @param options - Opcje konfiguracji
 * @returns Stan chronionej trasy
 */
export function useProtectedRoute(options: ProtectedRouteOptions = {}): ProtectedRouteState {
  const { redirectPath = '/login' } = options;
  const auth = useAuth();
  const toast = useToast();

  useEffect(() => {
    // Jeśli status to unauthenticated (i NIE loading), przekieruj
    // IMPORTANT: Nie przekierowuj podczas 'loading' - czekaj aż status będzie definitywny
    if (auth.status === 'unauthenticated' && !auth.isLoading) {
      // DEBUG: Log stan przed przekierowaniem
      console.log('[useProtectedRoute] Przekierowuję - brak autoryzacji', {
        status: auth.status,
        isLoading: auth.isLoading,
        hasToken: !!auth.token,
        hasUser: !!auth.user,
        pathname: window.location.pathname,
      });

      toast.push({
        type: 'error',
        text: 'Musisz być zalogowany, aby uzyskać dostęp do tej strony.',
      });

      // Przekieruj do strony logowania
      const currentPath = window.location.pathname;
      const redirectUrl = `${redirectPath}?redirect=${encodeURIComponent(currentPath)}`;

      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 500);
    }
  }, [auth.status, auth.isLoading, auth.token, auth.user, redirectPath, toast]);

  // Określ status trasy
  let status: 'loading' | 'ready' | 'redirect' = 'loading';

  if (auth.status === 'authenticated' && auth.user) {
    status = 'ready';
  } else if (auth.status === 'unauthenticated') {
    status = 'redirect';
  }

  return {
    status,
    isReady: status === 'ready',
  };
}
