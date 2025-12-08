import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

/**
 * Props dla DeleteConfirmationDialog
 */
type DeleteConfirmationDialogProps = {
  isOpen: boolean;
  offerTitle: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
};

/**
 * Dialog potwierdzenia usunięcia oferty
 *
 * Funkcjonalności:
 * - Wyświetla ostrzeżenie przed usunięciem
 * - Przyciski: "Usuń" (destructive) i "Anuluj"
 * - Wywołuje callback onConfirm -> DELETE /api/offers/:offer_id
 * - Obsługuje stan loading podczas usuwania
 */
export function DeleteConfirmationDialog({
  isOpen,
  offerTitle,
  onCancel,
  onConfirm,
  isDeleting,
}: DeleteConfirmationDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Czy na pewno chcesz usunąć tę ofertę?</AlertDialogTitle>
          <AlertDialogDescription>
            Zamierzasz usunąć ofertę <strong>"{offerTitle}"</strong>.
            <br />
            <br />
            Ta akcja jest nieodwracalna. Oferta zostanie trwale usunięta z systemu.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Anuluj</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Usuwanie...' : 'Usuń ofertę'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
