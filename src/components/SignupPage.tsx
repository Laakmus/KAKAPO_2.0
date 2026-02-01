import { RegistrationForm } from '@/components/RegistrationForm';
import { FooterLinks } from '@/components/FooterLinks';
import type { ApiErrorResponse } from '@/types';

/**
 * Komponent SignupPage
 *
 * Strona rejestracji użytkownika.
 * Zawiera formularz rejestracji, komunikaty oraz link do logowania.
 *
 * Funkcjonalności:
 * - Wyświetla formularz rejestracji
 * - Obsługuje success/error callbacks z formularza
 * - Wyświetla link do strony logowania
 * - Centruje zawartość na stronie
 *
 * Uwaga: Przekierowanie zalogowanych użytkowników jest obsługiwane
 * na poziomie routingu lub middleware (jeśli dostępne).
 */
export function SignupPage() {
  /**
   * Handler sukcesu rejestracji
   * @param message - Komunikat sukcesu z API
   */
  const handleSuccess = (_message: string) => {
    // Sukces jest już obsługiwany w formularzu przez GlobalNotification
    // Ten handler jest dostępny dla dodatkowych akcji (np. analytics, przekierowanie)
    // np. window.location.href = '/login?registered=true';
  };

  /**
   * Handler błędu rejestracji
   * @param error - Błąd z API lub string
   */
  const handleError = (error: ApiErrorResponse | string) => {
    console.error('Błąd rejestracji:', error);
    // Błędy są już obsługiwane w formularzu i hooku
    // Ten handler jest dostępny dla dodatkowych akcji (np. analytics)
  };

  return (
    <div
      data-testid="signup-page"
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-background"
    >
      {/* Nagłówek */}
      <div className="w-full max-w-md mb-8 text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">Utwórz konto</h1>
        <p className="text-muted-foreground">Wypełnij formularz, aby się zarejestrować</p>
      </div>

      {/* Formularz rejestracji */}
      <div className="w-full max-w-md bg-card rounded-lg shadow-md p-8 border border-border">
        <RegistrationForm onSuccess={handleSuccess} onError={handleError} />
      </div>

      {/* Link do logowania */}
      <div className="w-full max-w-md mt-6">
        <FooterLinks />
      </div>
    </div>
  );
}
