import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileEditFormSchema, type ProfileEditFormValues } from '@/schemas/profile.schema';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import type { ProfileEditPayload } from '@/types';

/**
 * Props dla ProfileEditForm
 */
type ProfileEditFormProps = {
  initialValues: ProfileEditPayload;
  onSubmit: (payload: ProfileEditPayload) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
};

/**
 * Formularz inline edycji profilu
 *
 * Funkcjonalności:
 * - Pola: first_name, last_name (email read-only zgodnie z Supabase Auth)
 * - Walidacja zgodna z backendem (react-hook-form + zod)
 * - Submit -> PATCH /api/users/me
 * - Cancel -> powrót do ProfileViewMode
 */
export function ProfileEditForm({ initialValues, onSubmit, onCancel, isSubmitting }: ProfileEditFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileEditFormValues>({
    resolver: zodResolver(profileEditFormSchema),
    defaultValues: {
      first_name: initialValues.first_name,
      last_name: initialValues.last_name,
    },
  });

  const handleFormSubmit = async (data: ProfileEditFormValues) => {
    // Jeśli nic się nie zmieniło, anuluj
    if (!isDirty) {
      onCancel();
      return;
    }

    await onSubmit(data);
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Edytuj profil</h2>

      <form data-testid="profile-edit-form" onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* Imię */}
        <div>
          <Label htmlFor="first_name">Imię</Label>
          <Input
            id="first_name"
            data-testid="profile-edit-firstname"
            {...register('first_name')}
            placeholder="Twoje imię"
            disabled={isSubmitting}
            className="mt-1"
          />
          {errors.first_name && <p className="text-sm text-destructive mt-1">{errors.first_name.message}</p>}
        </div>

        {/* Nazwisko */}
        <div>
          <Label htmlFor="last_name">Nazwisko</Label>
          <Input
            id="last_name"
            data-testid="profile-edit-lastname"
            {...register('last_name')}
            placeholder="Twoje nazwisko"
            disabled={isSubmitting}
            className="mt-1"
          />
          {errors.last_name && <p className="text-sm text-destructive mt-1">{errors.last_name.message}</p>}
        </div>

        {/* Wskaźnik edycji */}
        {isDirty && !isSubmitting && <p className="text-xs text-muted-foreground">Masz niezapisane zmiany</p>}

        {/* Akcje */}
        <div className="flex gap-2 justify-end pt-2">
          <Button
            data-testid="profile-edit-cancel"
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Anuluj
          </Button>
          <Button data-testid="profile-edit-save" type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? 'Zapisywanie...' : 'Zapisz zmiany'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
