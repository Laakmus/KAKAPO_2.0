import type { InterestRealizationState } from '@/types';

/**
 * Buduje obiekt InterestRealizationState na podstawie statusów obu stron wymiany.
 *
 * Używane w ChatDetailsPage i ChatsViewPage do przekazania stanu realizacji
 * do komponentu ChatStatusControls.
 *
 * @param myStatus - status realizacji aktualnego użytkownika
 * @param otherStatus - status realizacji drugiej strony (może być undefined)
 */
export function buildRealizationState(
  myStatus: string | undefined,
  otherStatus: string | undefined,
): InterestRealizationState | undefined {
  if (!myStatus) return undefined;

  const bothRealized = myStatus === 'REALIZED' && otherStatus === 'REALIZED';

  return {
    can_realize: myStatus === 'ACCEPTED',
    can_unrealize: myStatus === 'WAITING',
    other_confirmed: otherStatus === 'WAITING' || otherStatus === 'REALIZED',
    status: myStatus as InterestRealizationState['status'],
    message:
      myStatus === 'ACCEPTED'
        ? 'Wymiana została zaakceptowana. Możesz potwierdzić realizację.'
        : myStatus === 'WAITING'
          ? 'Potwierdziłeś realizację. Oczekiwanie na drugą stronę.'
          : bothRealized
            ? 'Wymiana została zrealizowana przez obie strony!'
            : undefined,
  };
}
