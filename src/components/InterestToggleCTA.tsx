import React, { useCallback, useRef, useState } from 'react';
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
  /**
   * Czy użytkownik może wyrazić zainteresowanie (np. ma aktywne oferty do zaoferowania).
   * Domyślnie true (brak blokady).
   */
  canExpressInterest?: boolean;
  /**
   * Callback wywoływany gdy użytkownik próbuje wyrazić zainteresowanie,
   * ale jest to zablokowane (np. brak aktywnych ofert).
   */
  onBlockedExpressInterest?: () => void;
  onExpress: (offerId: string) => void;
  onCancel: (interestId: string) => void;
};

type BlockedTooltipState = {
  open: boolean;
  x: number;
  y: number;
  message: string;
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
  canExpressInterest = true,
  onBlockedExpressInterest,
  onExpress,
  onCancel,
}: InterestToggleCTAProps) {
  /**
   * Sprawdź czy przycisk powinien być disabled
   */
  const isDisabled = isOwner || status === 'REMOVED' || isMutating || (isInterested && !currentInterestId); // Brak interest_id do anulowania
  const isBlockedByNoOffers = !isInterested && !isDisabled && !canExpressInterest;

  const [blockedTooltip, setBlockedTooltip] = useState<BlockedTooltipState>({
    open: false,
    x: 0,
    y: 0,
    message: '',
  });
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  const showBlockedTooltip = useCallback((x: number, y: number, message: string) => {
    // Mały offset żeby nie zasłaniać kursora
    const offset = 12;
    const maxWidth = 320; // używane do prostego clampu w poziomie

    const clampedX = typeof window !== 'undefined' ? Math.min(x + offset, window.innerWidth - maxWidth) : x + offset;
    const clampedY = typeof window !== 'undefined' ? Math.min(y + offset, window.innerHeight - 80) : y + offset;

    // Prosty throttling: nie aktualizuj jeśli zmiana minimalna (żeby nie spamować renderów)
    const last = lastPosRef.current;
    if (last && Math.abs(last.x - clampedX) < 2 && Math.abs(last.y - clampedY) < 2 && blockedTooltip.open) {
      return;
    }
    lastPosRef.current = { x: clampedX, y: clampedY };

    setBlockedTooltip({ open: true, x: clampedX, y: clampedY, message });
  }, [blockedTooltip.open]);

  const hideBlockedTooltip = useCallback(() => {
    lastPosRef.current = null;
    setBlockedTooltip((prev) => (prev.open ? { ...prev, open: false } : prev));
  }, []);

  /**
   * Handler dla kliknięcia przycisku
   */
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isInterested && currentInterestId) {
      // Anuluj zainteresowanie
      onCancel(currentInterestId);
    } else if (!isInterested) {
      // Blokada: user nie ma aktywnej oferty do zaoferowania
      if (!canExpressInterest) {
        const msg = 'Nie masz oferty do zaoferowania';
        showBlockedTooltip(e.clientX, e.clientY, msg);
        onBlockedExpressInterest?.();
        return;
      }
      // Wyraź zainteresowanie
      onExpress(offerId);
    }
    },
    [
      isInterested,
      currentInterestId,
      offerId,
      onExpress,
      onCancel,
      canExpressInterest,
      onBlockedExpressInterest,
      showBlockedTooltip,
    ],
  );

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!isBlockedByNoOffers) return;
      showBlockedTooltip(e.clientX, e.clientY, 'Nie masz oferty do zaoferowania');
    },
    [isBlockedByNoOffers, showBlockedTooltip],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!isBlockedByNoOffers) return;
      showBlockedTooltip(e.clientX, e.clientY, 'Nie masz oferty do zaoferowania');
    },
    [isBlockedByNoOffers, showBlockedTooltip],
  );

  const handleMouseLeave = useCallback(() => {
    if (!isBlockedByNoOffers) return;
    hideBlockedTooltip();
  }, [isBlockedByNoOffers, hideBlockedTooltip]);

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
  } else if (isBlockedByNoOffers) {
    ariaLabel = 'Nie masz oferty do zaoferowania';
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
        className={`w-full ${isBlockedByNoOffers ? 'opacity-60' : ''}`}
        aria-label={ariaLabel}
        aria-busy={isMutating}
        aria-disabled={isBlockedByNoOffers ? 'true' : undefined}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
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

      {/* Komunikat obok kursora przy zablokowanej akcji */}
      {blockedTooltip.open && (
        <div
          role="status"
          aria-live="polite"
          className="fixed z-50 pointer-events-none"
          style={{ left: blockedTooltip.x, top: blockedTooltip.y }}
        >
          <div className="max-w-xs rounded-md border border-red-200 bg-red-50 text-red-900 shadow-lg px-3 py-2 text-sm font-medium">
            {blockedTooltip.message}
          </div>
        </div>
      )}

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
