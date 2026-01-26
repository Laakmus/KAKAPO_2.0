import { LoginForm } from '@/components/LoginForm';
import type { ApiErrorResponse, AuthTokensResponse } from '@/types';
import { hardNavigate } from '@/utils/navigation';

/**
 * Komponent LoginPage
 *
 * Strona logowania użytkownika.
 * Zawiera formularz logowania, komunikaty oraz link do rejestracji.
 *
 * Funkcjonalności:
 * - Wyświetla formularz logowania
 * - Obsługuje success/error callbacks z formularza
 * - Przekierowuje do /offers po udanym logowaniu
 * - Wyświetla link do strony rejestracji
 * - Centruje zawartość na stronie
 *
 * Uwaga: Przekierowanie zalogowanych użytkowników jest obsługiwane
 * na poziomie routingu lub middleware (jeśli dostępne).
 */
export function LoginPage() {
  const computeSafeRedirectTarget = (redirectRaw: string | null): string | null => {
    if (!redirectRaw) return null;
    if (redirectRaw === '/login') return null;

    // Block protocol-relative URLs like //evil.com
    if (redirectRaw.startsWith('//')) return null;

    let url: URL;
    try {
      url = new URL(redirectRaw, window.location.origin);
    } catch {
      return null;
    }

    // Only allow same-origin redirects
    if (url.origin !== window.location.origin) return null;

    // Prevent redirecting back to any variant of /login (e.g. /login?redirect=..., /login/, /login#...)
    if (url.pathname === '/login' || url.pathname.startsWith('/login/')) return null;

    // Prevent no-op navigations (stuck on "Przekierowywanie..." if browser ignores replace to same URL)
    const current = new URL(window.location.href);
    if (url.pathname === current.pathname && url.search === current.search && url.hash === current.hash) return null;

    return `${url.pathname}${url.search}${url.hash}`;
  };

  /**
   * Handler sukcesu logowania
   * Zapisuje tokeny (obsługiwane przez useLogin) i przekierowuje do /offers
   * @param _tokens - Tokeny JWT z API (nieużywane - obsługiwane przez useLogin)
   */
  const handleSuccess = (_tokens: AuthTokensResponse) => {
    // Tokeny są już zapisane w localStorage przez useLogin
    // Przekieruj użytkownika do docelowej strony (jeśli przyszli z protected route)
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    console.warn('[LoginPage] handleSuccess: redirect z query =', redirect);
    const safeTarget = computeSafeRedirectTarget(redirect) ?? '/offers';
    console.warn('[LoginPage] handleSuccess: safeTarget =', safeTarget);

    // CRITICAL: Set flag to prevent useProtectedRoute from redirecting immediately after login
    // (AuthContext needs time to read token from localStorage and fetch user)
    localStorage.setItem('_just_logged_in', Date.now().toString());

    // CRITICAL: Delay navigation slightly to ensure localStorage.setItem() has fully synced
    // and AuthContext will read the token on the next page
    console.warn('[LoginPage] Opozniam nawigację o 300ms żeby localStorage się zsynchronizował');
    setTimeout(() => {
      console.warn('[LoginPage] Teraz wykonuję nawigację do:', safeTarget);
      hardNavigate(safeTarget);
    }, 300);
  };

  /**
   * Handler błędu logowania
   * @param error - Błąd z API lub string
   */
  const handleError = (error: ApiErrorResponse | string) => {
    console.error('Błąd logowania:', error);
    // Błędy są już obsługiwane w formularzu i hooku
    // Ten handler jest dostępny dla dodatkowych akcji (np. analytics)
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-background">
      {/* Nagłówek */}
      <div className="w-full max-w-md mb-8 text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">Zaloguj się</h1>
        <p className="text-muted-foreground">Wpisz swoje dane, aby się zalogować</p>
      </div>

      {/* Formularz logowania */}
      <div className="w-full max-w-md bg-card rounded-lg shadow-md p-8 border border-border">
        <LoginForm onSuccess={handleSuccess} onError={handleError} />
      </div>
    </div>
  );
}
