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
    const safeTarget = redirect && redirect.startsWith('/') ? redirect : '/offers';

    // Use hard navigation to ensure full reload and fresh auth state
    hardNavigate(safeTarget);
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
