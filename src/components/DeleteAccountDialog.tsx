import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { deleteAccountFormSchema, type DeleteAccountFormValues } from '@/schemas/profile.schema';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import type { DeleteAccountCommand } from '@/types';

/**
 * Props dla DeleteAccountDialog
 */
type DeleteAccountDialogProps = {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: (payload: DeleteAccountCommand) => Promise<void>;
  isDeleting: boolean;
  error?: string;
};

/**
 * Dialog potwierdzenia usunięcia konta
 *
 * Funkcjonalności:
 * - Wyświetla ostrzeżenie o nieodwracalności
 * - Pole hasła do re-autoryzacji
 * - Przyciski: "Usuń konto" (destructive) i "Anuluj"
 * - Wywołuje callback onConfirm -> DELETE /api/users/me
 * - Obsługuje stan loading podczas usuwania
 * - Wyświetla błędy (np. nieprawidłowe hasło)
 */
export function DeleteAccountDialog({ isOpen, onCancel, onConfirm, isDeleting, error }: DeleteAccountDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DeleteAccountFormValues>({
    resolver: zodResolver(deleteAccountFormSchema),
  });

  const handleFormSubmit = async (data: DeleteAccountFormValues) => {
    await onConfirm({ password: data.password });
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Czy na pewno chcesz usunąć swoje konto?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                Ta akcja jest <strong>nieodwracalna</strong>. Wszystkie Twoje dane, w tym oferty, zainteresowania i
                historia wymian zostaną trwale usunięte z systemu.
              </p>
              <p className="text-destructive font-medium">Potwierdź usunięcie konta podając swoje hasło:</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Pole hasła */}
          <div>
            <Label htmlFor="password">Hasło</Label>
            <Input
              id="password"
              type="password"
              {...register('password')}
              placeholder="Wprowadź swoje hasło"
              disabled={isDeleting}
              className="mt-1"
              autoComplete="current-password"
            />
            {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
          </div>

          {/* Błąd z API (np. nieprawidłowe hasło) */}
          {error && (
            <div className="bg-destructive/10 border border-destructive text-destructive px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isDeleting}>
              Anuluj
            </Button>
            <Button type="submit" variant="destructive" disabled={isDeleting}>
              {isDeleting ? 'Usuwanie...' : 'Usuń konto'}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
