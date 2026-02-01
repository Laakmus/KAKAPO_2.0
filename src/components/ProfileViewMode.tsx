import React from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import type { UserProfileDTO } from '@/types';

/**
 * Props dla ProfileViewMode
 */
type ProfileViewModeProps = {
  profile: UserProfileDTO;
  onEdit: () => void;
  onDeleteRequest: () => void;
};

/**
 * Widok read-only profilu użytkownika
 *
 * Wyświetla:
 * - Dane profilu jako statyczny tekst (imię, nazwisko)
 * - Przycisk "Edytuj profil"
 * - Przycisk "Usuń konto" (destrukcyjny)
 */
export function ProfileViewMode({ profile, onEdit, onDeleteRequest }: ProfileViewModeProps) {
  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Dane profilu</h2>
        <Button data-testid="profile-edit-button" onClick={onEdit} variant="outline" size="sm">
          Edytuj profil
        </Button>
      </div>

      <div className="space-y-4">
        {/* Imię */}
        <div>
          <label className="text-sm font-medium text-muted-foreground">Imię</label>
          <p data-testid="profile-first-name" className="text-base mt-1">
            {profile.first_name || 'Nie podano'}
          </p>
        </div>

        {/* Nazwisko */}
        <div>
          <label className="text-sm font-medium text-muted-foreground">Nazwisko</label>
          <p data-testid="profile-last-name" className="text-base mt-1">
            {profile.last_name || 'Nie podano'}
          </p>
        </div>
      </div>

      {/* Separator */}
      <div className="border-t my-6" />

      {/* Sekcja usuwania konta */}
      <div>
        <h3 className="text-lg font-semibold text-destructive mb-2">Strefa niebezpieczna</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Usunięcie konta jest nieodwracalne. Wszystkie Twoje dane zostaną trwale usunięte.
        </p>
        <Button data-testid="profile-delete-button" onClick={onDeleteRequest} variant="destructive" size="sm">
          Usuń konto
        </Button>
      </div>
    </Card>
  );
}
