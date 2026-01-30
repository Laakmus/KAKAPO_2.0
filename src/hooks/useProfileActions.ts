import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type {
  ProfileEditPayload,
  DeleteAccountCommand,
  ChangePasswordCommand,
  UserProfileDTO,
  ApiErrorResponse,
} from '@/types';

/**
 * Hook do zarządzania akcjami profilu (edycja, usuwanie konta)
 *
 * Funkcjonalności:
 * - Edycja profilu (PATCH /api/users/me)
 * - Usuwanie konta (DELETE /api/users/me)
 * - Obsługa stanów loading i błędów
 * - Automatyczne wylogowanie po usunięciu konta
 */
export function useProfileActions() {
  const { token, resetSession } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [changePasswordError, setChangePasswordError] = useState<string | undefined>();

  /**
   * Edycja profilu użytkownika
   */
  const editProfile = useCallback(
    async (payload: ProfileEditPayload): Promise<UserProfileDTO | null> => {
      if (!token) {
        setError('Brak autoryzacji');
        return null;
      }

      try {
        setIsSubmitting(true);
        setError(undefined);

        const response = await fetch('/api/users/me', {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = (await response.json()) as ApiErrorResponse;
          const errorMessage = errorData.error?.message || 'Nie udało się zaktualizować profilu';
          setError(errorMessage);

          // Jeśli 401 - redirect do loginu
          if (response.status === 401) {
            resetSession();
            window.location.href = '/login';
          }

          return null;
        }

        const updatedProfile: UserProfileDTO = await response.json();
        setError(undefined);
        return updatedProfile;
      } catch (err) {
        console.error('Error updating profile:', err);
        setError('Nie udało się połączyć z serwerem');
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [token, resetSession],
  );

  /**
   * Usunięcie konta użytkownika
   */
  const deleteAccount = useCallback(
    async (payload: DeleteAccountCommand): Promise<boolean> => {
      if (!token) {
        setError('Brak autoryzacji');
        return false;
      }

      try {
        setIsDeleting(true);
        setError(undefined);

        const response = await fetch('/api/users/me', {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = (await response.json()) as ApiErrorResponse;
          const errorMessage = errorData.error?.message || 'Nie udało się usunąć konta';

          // Specjalne obsługiwanie nieprawidłowego hasła
          if (response.status === 401) {
            setError('Nieprawidłowe hasło');
            return false;
          }

          setError(errorMessage);
          return false;
        }

        // Sukces - wyloguj użytkownika i przekieruj na /login
        setError(undefined);
        resetSession();
        window.location.href = '/login';
        return true;
      } catch (err) {
        console.error('Error deleting account:', err);
        setError('Nie udało się połączyć z serwerem');
        return false;
      } finally {
        setIsDeleting(false);
      }
    },
    [token, resetSession],
  );

  /**
   * Zmiana hasła użytkownika
   */
  const changePassword = useCallback(
    async (payload: ChangePasswordCommand): Promise<boolean> => {
      if (!token) {
        setChangePasswordError('Brak autoryzacji');
        return false;
      }

      try {
        setIsChangingPassword(true);
        setChangePasswordError(undefined);

        const response = await fetch('/api/users/me/password', {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = (await response.json()) as ApiErrorResponse;
          const errorMessage = errorData.error?.message || 'Nie udało się zmienić hasła';

          if (response.status === 401) {
            if (errorMessage === 'Nieprawidłowe hasło') {
              setChangePasswordError('Nieprawidłowe hasło');
              return false;
            }
            resetSession();
            window.location.href = '/login';
            return false;
          }

          if (response.status === 403) {
            resetSession();
            window.location.href = '/login';
            return false;
          }

          setChangePasswordError(errorMessage);
          return false;
        }

        setChangePasswordError(undefined);
        resetSession();
        window.location.href = '/login';
        return true;
      } catch (err) {
        console.error('Error changing password:', err);
        setChangePasswordError('Nie udało się połączyć z serwerem');
        return false;
      } finally {
        setIsChangingPassword(false);
      }
    },
    [token, resetSession],
  );

  return {
    editProfile,
    deleteAccount,
    changePassword,
    isSubmitting,
    isDeleting,
    isChangingPassword,
    error,
    changePasswordError,
  };
}
