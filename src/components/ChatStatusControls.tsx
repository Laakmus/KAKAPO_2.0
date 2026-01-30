import { useState } from 'react';
import type { InterestRealizationState } from '@/types';
import { Button } from './ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';

/**
 * Props dla komponentu RealizeButton
 */
type RealizeButtonProps = {
  onRealize: () => Promise<void>;
  isProcessing: boolean;
  disabled?: boolean;
};

/**
 * RealizeButton - Przycisk potwierdzenia realizacji wymiany z dialogiem
 *
 * Wyeksportowany osobno, żeby można go było użyć poza ChatStatusControls
 * (np. w MessageComposer obok przycisku "Wyślij").
 */
export function RealizeButton({ onRealize, isProcessing, disabled }: RealizeButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleConfirm = async () => {
    setIsOpen(false);
    await onRealize();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button disabled={isProcessing || disabled} variant="default">
          {isProcessing ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Przetwarzanie...
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Potwierdzam realizację
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Potwierdzenie realizacji wymiany</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">Czy na pewno chcesz potwierdzić realizację tej wymiany?</span>
            <span className="block text-foreground font-medium">
              Po potwierdzeniu status zmieni się na &quot;Zrealizowana&quot;.
            </span>
            <span className="block">
              Gdy druga strona również potwierdzi realizację, wymiana zostanie zapisana w historii.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Anuluj</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>Potwierdzam</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Props dla komponentu ChatStatusControls
 */
type ChatStatusControlsProps = {
  state: InterestRealizationState;
  onRealize: () => Promise<void>;
  onUnrealize: () => Promise<void>;
  isProcessing: boolean;
  /** Ukryj przycisk realizacji (używany gdy przycisk jest wyświetlany w innym miejscu) */
  hideRealizeButton?: boolean;
};

/**
 * ChatStatusControls - Panel z przyciskami realizacji wymiany
 *
 * Funkcjonalności:
 * - Przycisk "Zrealizowana" (gdy status ACCEPTED)
 * - Przycisk "Anuluj potwierdzenie" (gdy status REALIZED i druga strona nie potwierdziła)
 * - Komunikaty o statusie
 * - Wyłączanie podczas przetwarzania
 *
 * @param state - stan realizacji
 * @param onRealize - callback potwierdzenia realizacji
 * @param onUnrealize - callback cofnięcia potwierdzenia
 * @param isProcessing - czy trwa przetwarzanie
 */
export function ChatStatusControls({
  state,
  onRealize,
  onUnrealize,
  isProcessing,
  hideRealizeButton = false,
}: ChatStatusControlsProps) {
  // Jeśli brak stanu, nie wyświetlaj nic
  if (!state) {
    return null;
  }

  // Uwzględnij ukryty przycisk realizacji przy sprawdzaniu czy coś wyświetlić
  const hasRealizeAction = state.can_realize && !hideRealizeButton;
  const hasUnrealizeAction = state.can_unrealize;
  const hasStatusInfo = state.message || state.status;

  // Jeśli brak możliwości akcji ani informacji, nie wyświetlaj nic
  if (!hasRealizeAction && !hasUnrealizeAction && !hasStatusInfo) {
    return null;
  }

  return (
    <div className="bg-card border rounded-lg p-4 space-y-3">
      {/* Status message */}
      {state.message && (
        <div className="text-sm text-muted-foreground">
          <p>{state.message}</p>
        </div>
      )}

      {/* Status label */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Status wymiany:</span>
        <span
          className={`text-sm px-2 py-1 rounded ${
            state.status === 'REALIZED'
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : state.status === 'WAITING'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                : state.status === 'ACCEPTED'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
          }`}
        >
          {state.status === 'REALIZED'
            ? 'Zrealizowana'
            : state.status === 'WAITING'
              ? 'Oczekująca'
              : state.status === 'ACCEPTED'
                ? 'Zaakceptowana'
                : 'Proponowana'}
        </span>
      </div>

      {/* Action buttons */}
      {(hasRealizeAction || hasUnrealizeAction) && (
        <div className="flex gap-2">
          {hasRealizeAction && <RealizeButton onRealize={onRealize} isProcessing={isProcessing} />}

          {state.can_unrealize && (
            <Button onClick={onUnrealize} disabled={isProcessing} variant="outline">
              {isProcessing ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Przetwarzanie...
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Anuluj potwierdzenie
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Info text */}
      {state.status === 'ACCEPTED' && (
        <p className="text-xs text-muted-foreground">
          💡 Po potwierdzeniu realizacji przez obie strony, wymiana zostanie zapisana w historii.
        </p>
      )}

      {state.status === 'REALIZED' && state.other_confirmed && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-3">
          <p className="text-sm text-green-800 dark:text-green-200">
            ✅ Obie strony potwierdziły realizację! Wymiana została zapisana w historii.
          </p>
        </div>
      )}

      {state.status === 'WAITING' && (
        <p className="text-xs text-muted-foreground">
          ⏳ Oczekiwanie na potwierdzenie drugiej strony. Możesz anulować swoje potwierdzenie do momentu potwierdzenia
          przez drugą stronę.
        </p>
      )}
    </div>
  );
}
