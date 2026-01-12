import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@/schemas/auth.schema';
import { useLogin } from '@/hooks/useLogin';
import { GlobalNotification } from '@/components/GlobalNotification';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { LoginFormValues, ApiErrorResponse, AuthTokensResponse } from '@/types';

/**
 * Props dla komponentu LoginForm
 */
type LoginFormProps = {
  /**
   * Callback wywoływany po udanym logowaniu
   */
  onSuccess?: (tokens: AuthTokensResponse) => void;
  /**
   * Callback wywoływany przy błędzie logowania
   */
  onError?: (error: ApiErrorResponse | string) => void;
  /**
   * Opcjonalne początkowe wartości formularza (np. dla testów lub pre-fill)
   */
  initialValues?: Partial<LoginFormValues>;
  /**
   * Czy pokazać link do rejestracji w stopce formularza
   * @default true
   */
  showFooterLink?: boolean;
};

/**
 * Komponent LoginForm
 *
 * Formularz logowania użytkownika z walidacją Zod i react-hook-form.
 *
 * Funkcjonalności:
 * - Walidacja inline (onBlur)
 * - Integracja z API przez useLogin hook
 * - Mapowanie błędów API na pola formularza
 * - Auto-focus na pierwszym polu przy montowaniu
 * - Auto-focus na pierwszym błędnym polu po walidacji
 * - Wyświetlanie globalnych komunikatów (success/error) z opcjonalnym CTA
 * - Wyłączanie formularza podczas loading
 * - Link do rejestracji w stopce
 *
 * @param props - Props komponentu
 */
export function LoginForm({ onSuccess, onError, initialValues, showFooterLink = true }: LoginFormProps) {
  const { isLoading, notification, login, clearNotification } = useLogin();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Referencje do pól formularza (dla auto-focus)
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Konfiguracja react-hook-form z walidacją Zod
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: initialValues?.email || '',
      password: initialValues?.password || '',
    },
    mode: 'onBlur', // Walidacja przy opuszczeniu pola
  });

  // Auto-focus na pole email po zamontowaniu komponentu
  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  // Auto-focus na pierwsze błędne pole po walidacji
  useEffect(() => {
    const firstErrorField = Object.keys(errors)[0] as keyof LoginFormValues | undefined;

    if (firstErrorField) {
      const refMap = {
        email: emailInputRef,
        password: passwordInputRef,
      };

      refMap[firstErrorField]?.current?.focus();
    }
  }, [errors]);

  /**
   * Handler submitu formularza
   */
  const onSubmit = async (values: LoginFormValues) => {
    // Jeśli już przetwarzamy request lub przekierowujemy, ignoruj kolejne submit-y (anty-dublowanie requestów)
    if (isRedirecting || isLoading || isSubmitting) return;

    // Wyczyść poprzednie notyfikacje
    clearNotification();

    // Wywołaj API
    const result = await login(values);

    if (result.success) {
      // Sukces - zablokuj formularz i pozwól stronie przekierować
      setIsRedirecting(true);
      // Sukces - wywołaj callback z tokenami
      try {
        onSuccess?.(result.data);
      } catch (e) {
        // Safety fallback - jeśli callback rzuci wyjątek, spróbuj prostego przekierowania
        console.error('Login success handler error:', e);
        window.location.href = '/offers';
      }
    } else {
      // Błąd - mapuj błędy API na pola formularza
      if (typeof result.error !== 'string') {
        const apiError = result.error;
        const errorMessage = apiError.error?.message || 'Wystąpił błąd podczas logowania';
        const errorField = apiError.error?.details?.field;

        // Mapowanie błędów 400/422 na konkretne pola
        if (errorField === 'email' || errorMessage.toLowerCase().includes('email')) {
          setError('email', {
            type: 'server',
            message: errorMessage,
          });
        } else if (errorField === 'password' || errorMessage.toLowerCase().includes('hasło')) {
          setError('password', {
            type: 'server',
            message: errorMessage,
          });
        }
      }

      // Wywołaj callback błędu
      onError?.(result.error);
    }
  };

  // Połącz register z ref dla auto-focus
  const emailRegister = register('email');
  const passwordRegister = register('password');

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Globalna notyfikacja (z CTA jeśli dostępne) */}
      <GlobalNotification message={notification} />

      {/* Formularz */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Pole: Email */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="twoj@email.com"
            disabled={isRedirecting || isLoading || isSubmitting}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
            {...emailRegister}
            ref={(e) => {
              emailRegister.ref(e);
              emailInputRef.current = e;
            }}
          />
          {errors.email && (
            <p id="email-error" className="text-sm text-red-600" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Pole: Hasło */}
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">
            Hasło
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="Minimum 6 znaków"
            disabled={isRedirecting || isLoading || isSubmitting}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'password-error' : undefined}
            {...passwordRegister}
            ref={(e) => {
              passwordRegister.ref(e);
              passwordInputRef.current = e;
            }}
          />
          {errors.password && (
            <p id="password-error" className="text-sm text-red-600" role="alert">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Przycisk submit */}
        <Button type="submit" className="w-full" disabled={isRedirecting || isLoading || isSubmitting}>
          {isRedirecting ? 'Przekierowywanie...' : isLoading || isSubmitting ? 'Logowanie...' : 'Zaloguj się'}
        </Button>
      </form>

      {/* Link do rejestracji */}
      {showFooterLink && (
        <p className="text-center text-sm text-gray-600 mt-6">
          Nie masz konta?{' '}
          <a href="/signup" className="font-medium text-primary hover:underline focus:underline focus:outline-none">
            Zarejestruj się
          </a>
        </p>
      )}
    </div>
  );
}
