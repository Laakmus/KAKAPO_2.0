import React, { useCallback } from 'react';
import { Button } from './ui/button';

/**
 * Props dla InterestToggleCTA
 */
type InterestToggleCTAProps = {
  offerId: string;
  isInterested: boolean;
  isOwner: boolean;
  currentInterestId?: string;
  status: string;
  isMutating: boolean;
  interestsCount: number;
  onExpress: (offerId: string) => void;
  onCancel: (interestId: string) => void;
};

/**
 * Przycisk do zarządzania zainteresowaniem ofertą
 *
 * Funkcjonalności:
 * - Wyświetla odpowiedni tekst w zależności od stanu (Jestem zainteresowany / Anuluj zainteresowanie)
 * - Disabled gdy: użytkownik jest właścicielem, status REMOVED, trwa mutacja
 * - Loading state podczas mutacji (spinner + aria-busy)
 * - Ikony i wizualne wskazówki
 * - Walidacja przed akcją
 */
export function InterestToggleCTA({
  offerId,
  isInterested,
  isOwner,
  currentInterestId,
  status,
  isMutating,
  interestsCount,
  onExpress,
  onCancel,
}: InterestToggleCTAProps) {
  /**
   * Handler dla kliknięcia przycisku
   */
  const handleClick = useCallback(() => {
    if (isInterested && currentInterestId) {
      // Anuluj zainteresowanie
      onCancel(currentInterestId);
    } else if (!isInterested) {
      // Wyraź zainteresowanie
      onExpress(offerId);
    }
  }, [isInterested, currentInterestId, offerId, onExpress, onCancel]);

  /**
   * Sprawdź czy przycisk powinien być disabled
   */
  const isDisabled = isOwner || status === 'REMOVED' || isMutating || (isInterested && !currentInterestId); // Brak interest_id do anulowania

  /**
   * Tekst przycisku
   */
  const buttonText = isInterested ? 'Anuluj zainteresowanie' : 'Jestem zainteresowany';

  /**
   * Tooltip / aria-label
   */
  let ariaLabel = buttonText;
  if (isOwner) {
    ariaLabel = 'Nie możesz być zainteresowany własną ofertą';
  } else if (status === 'REMOVED') {
    ariaLabel = 'Oferta została usunięta';
  } else if (isMutating) {
    ariaLabel = 'Trwa przetwarzanie...';
  }

  /**
   * Wariant przycisku
   */
  const variant = isInterested ? 'outline' : 'default';

  return (
    <div className="space-y-3">
      {/* Przycisk główny */}
      <Button
        onClick={handleClick}
        disabled={isDisabled}
        variant={variant}
        size="lg"
        className="w-full"
        aria-label={ariaLabel}
        aria-busy={isMutating}
      >
        {/* Spinner podczas mutacji */}
        {isMutating ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Przetwarzanie...
          </>
        ) : (
          <>
            {/* Ikona */}
            {isInterested ? (
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            )}
            {buttonText}
          </>
        )}
      </Button>

      {/* Info dla właściciela */}
      {isOwner && (
        <p className="text-sm text-muted-foreground text-center">
          To jest Twoja oferta. Liczba zainteresowanych: <strong>{interestsCount}</strong>
        </p>
      )}

      {/* Info dla oferty usuniętej */}
      {!isOwner && status === 'REMOVED' && (
        <p className="text-sm text-destructive text-center">
          Ta oferta została usunięta i nie można wyrazić zainteresowania
        </p>
      )}

      {/* Info o braku interest_id */}
      {!isOwner && isInterested && !currentInterestId && !isMutating && (
        <p className="text-sm text-muted-foreground text-center">
          Wyrażono zainteresowanie. Odśwież stronę aby móc anulować.
        </p>
      )}
    </div>
  );
}
