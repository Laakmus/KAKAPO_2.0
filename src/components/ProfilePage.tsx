import React, { useState } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useProfileActions } from '@/hooks/useProfileActions';
import { useToast } from '@/contexts/ToastContext';
import { ProfileHeader } from './ProfileHeader';
import { ProfileStats } from './ProfileStats';
import { ProfileViewMode } from './ProfileViewMode';
import { ProfileEditForm } from './ProfileEditForm';
import { DeleteAccountDialog } from './DeleteAccountDialog';
import { LoadingSkeleton } from './LoadingSkeleton';
import { ErrorBanner } from './ErrorBanner';
import type { ProfileEditPayload, DeleteAccountCommand } from '@/types';

/**
 * Główny komponent strony Profilu użytkownika
 *
 * Funkcjonalności:
 * - Fetchuje profil z GET /api/users/me
 * - Toggle między widokiem read-only a formularzem edycji
 * - Modal usunięcia konta z weryfikacją hasłem
 * - Obsługa stanów loading, error
 * - Toast notifications dla sukcesu/błędów
 */
export function ProfilePage() {
  // Fetchowanie profilu
  const { profile, isLoading, error, refetch } = useProfile();

  // Akcje profilu
  const { editProfile, deleteAccount, isSubmitting, isDeleting, error: actionError } = useProfileActions();

  // Toast notifications
  const { push: showToast } = useToast();

  // Stan edycji (toggle między view a edit mode)
  const [isEditing, setIsEditing] = useState(false);

  // Stan modalu usuwania
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  /**
   * Handler rozpoczęcia edycji
   */
  const handleEditStart = () => {
    setIsEditing(true);
  };

  /**
   * Handler anulowania edycji
   */
  const handleEditCancel = () => {
    setIsEditing(false);
  };

  /**
   * Handler zapisania zmian profilu
   */
  const handleEditSubmit = async (payload: ProfileEditPayload) => {
    const result = await editProfile(payload);

    if (result) {
      showToast({
        type: 'success',
        text: 'Profil zaktualizowany pomyślnie',
      });
      setIsEditing(false);
      refetch(); // Odśwież dane profilu
    } else {
      showToast({
        type: 'error',
        text: actionError || 'Nie udało się zaktualizować profilu',
      });
    }
  };

  /**
   * Handler otwarcia modalu usunięcia
   */
  const handleDeleteRequest = () => {
    setDeleteDialogOpen(true);
  };

  /**
   * Handler anulowania usunięcia
   */
  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };

  /**
   * Handler potwierdzenia usunięcia konta
   */
  const handleDeleteConfirm = async (payload: DeleteAccountCommand) => {
    const success = await deleteAccount(payload);

    if (success) {
      // Po sukcesie nastąpi automatyczne wylogowanie i redirect w hooku
      showToast({
        type: 'success',
        text: 'Konto zostało usunięte',
      });
    }
    // Błąd zostanie wyświetlony w modalu (error prop z useProfileActions)
  };

  /**
   * Handler retry po błędzie
   */
  const handleRetry = () => {
    refetch();
  };

  // Stan loading
  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <LoadingSkeleton height="h-20" className="mb-6" />
        <LoadingSkeleton height="h-64" className="mb-4" />
        <LoadingSkeleton height="h-48" />
      </div>
    );
  }

  // Stan błędu
  if (error || !profile) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <ErrorBanner
          message={error?.error.message || 'Wystąpił nieoczekiwany błąd'}
          onRetry={handleRetry}
          isAuthError={error?.status === 401 || error?.status === 403}
        />
      </div>
    );
  }

  // Główny widok
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Nagłówek */}
      <ProfileHeader firstName={profile.first_name} lastName={profile.last_name} />

      {/* Statystyki */}
      <ProfileStats
        email={profile.email}
        createdAt={profile.created_at}
        activeOffersCount={profile.active_offers_count}
      />

      {/* Widok lub formularz edycji */}
      {isEditing ? (
        <ProfileEditForm
          initialValues={{
            first_name: profile.first_name,
            last_name: profile.last_name,
          }}
          onSubmit={handleEditSubmit}
          onCancel={handleEditCancel}
          isSubmitting={isSubmitting}
        />
      ) : (
        <ProfileViewMode profile={profile} onEdit={handleEditStart} onDeleteRequest={handleDeleteRequest} />
      )}

      {/* Modal usunięcia konta */}
      <DeleteAccountDialog
        isOpen={deleteDialogOpen}
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        error={actionError}
      />
    </div>
  );
}
