import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupSchema } from '@/schemas/auth.schema';
import { useSignup } from '@/hooks/useSignup';
import { GlobalNotification } from '@/components/GlobalNotification';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { RegistrationFormValues, ApiErrorResponse } from '@/types';

/**
 * Props dla komponentu RegistrationForm
 */
type RegistrationFormProps = {
  /**
   * Callback wywoływany po udanej rejestracji
   */
  onSuccess?: (message: string) => void;
  /**
   * Callback wywoływany przy błędzie rejestracji
   */
  onError?: (error: ApiErrorResponse | string) => void;
  /**
   * Opcjonalne początkowe wartości formularza (np. dla testów)
   */
  initialValues?: Partial<RegistrationFormValues>;
};

/**
 * Komponent RegistrationForm
 *
 * Formularz rejestracji użytkownika z walidacją Zod i react-hook-form.
 *
 * Funkcjonalności:
 * - Walidacja inline (onBlur/onChange)
 * - Integracja z API przez useSignup hook
 * - Mapowanie błędów API na pola formularza
 * - Auto-focus na pierwszym polu przy montowaniu
 * - Auto-focus na pierwszym błędnym polu po walidacji
 * - Wyświetlanie globalnych komunikatów (success/error)
 * - Wyłączanie formularza podczas loading
 *
 * @param props - Props komponentu
 */
export function RegistrationForm({ onSuccess, onError, initialValues }: RegistrationFormProps) {
  const { isLoading, notification, signup, clearNotification } = useSignup();
  const [isSuccess, setIsSuccess] = useState(false);

  // Referencje do pól formularza (dla auto-focus)
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const firstNameInputRef = useRef<HTMLInputElement>(null);
  const lastNameInputRef = useRef<HTMLInputElement>(null);

  // Konfiguracja react-hook-form z walidacją Zod
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: initialValues?.email || '',
      password: initialValues?.password || '',
      first_name: initialValues?.first_name || '',
      last_name: initialValues?.last_name || '',
    },
    mode: 'onBlur', // Walidacja przy opuszczeniu pola
  });

  // Auto-focus na pole email po zamontowaniu komponentu
  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  // Auto-focus na pierwsze błędne pole po walidacji
  useEffect(() => {
    const firstErrorField = Object.keys(errors)[0] as keyof RegistrationFormValues | undefined;

    if (firstErrorField) {
      const refMap = {
        email: emailInputRef,
        password: passwordInputRef,
        first_name: firstNameInputRef,
        last_name: lastNameInputRef,
      };

      refMap[firstErrorField]?.current?.focus();
    }
  }, [errors]);

  /**
   * Handler submitu formularza
   */
  const onSubmit = async (values: RegistrationFormValues) => {
    // Po sukcesie blokujemy formularz, żeby nie wysyłać requestu kilka razy
    if (isSuccess) return;

    // Wyczyść poprzednie notyfikacje
    clearNotification();

    // Wywołaj API
    const result = await signup(values);

    if (result.success) {
      setIsSuccess(true);
      // Sukces - wywołaj callback
      onSuccess?.(result.data.message);
    } else {
      // Błąd - mapuj błędy API na pola formularza
      if (typeof result.error !== 'string') {
        const apiError = result.error;
        const errorMessage = apiError.error?.message || 'Wystąpił błąd podczas rejestracji';
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
  const firstNameRegister = register('first_name');
  const lastNameRegister = register('last_name');

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Globalna notyfikacja */}
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
            disabled={isSuccess || isLoading || isSubmitting}
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
            placeholder="Minimum 8 znaków"
            disabled={isSuccess || isLoading || isSubmitting}
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

        {/* Pole: Imię */}
        <div className="space-y-2">
          <Label htmlFor="first_name" className="text-sm font-medium">
            Imię
          </Label>
          <Input
            id="first_name"
            type="text"
            placeholder="Jan"
            disabled={isSuccess || isLoading || isSubmitting}
            aria-invalid={!!errors.first_name}
            aria-describedby={errors.first_name ? 'first_name-error' : undefined}
            {...firstNameRegister}
            ref={(e) => {
              firstNameRegister.ref(e);
              firstNameInputRef.current = e;
            }}
          />
          {errors.first_name && (
            <p id="first_name-error" className="text-sm text-red-600" role="alert">
              {errors.first_name.message}
            </p>
          )}
        </div>

        {/* Pole: Nazwisko */}
        <div className="space-y-2">
          <Label htmlFor="last_name" className="text-sm font-medium">
            Nazwisko
          </Label>
          <Input
            id="last_name"
            type="text"
            placeholder="Kowalski"
            disabled={isSuccess || isLoading || isSubmitting}
            aria-invalid={!!errors.last_name}
            aria-describedby={errors.last_name ? 'last_name-error' : undefined}
            {...lastNameRegister}
            ref={(e) => {
              lastNameRegister.ref(e);
              lastNameInputRef.current = e;
            }}
          />
          {errors.last_name && (
            <p id="last_name-error" className="text-sm text-red-600" role="alert">
              {errors.last_name.message}
            </p>
          )}
        </div>

        {/* Przycisk submit */}
        <Button type="submit" className="w-full" disabled={isSuccess || isLoading || isSubmitting}>
          {isSuccess ? 'Zarejestrowano' : isLoading || isSubmitting ? 'Rejestracja...' : 'Zarejestruj się'}
        </Button>
      </form>
    </div>
  );
}
