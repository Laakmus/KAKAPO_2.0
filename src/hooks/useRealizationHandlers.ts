import { useCallback } from 'react';
import { useToast } from '@/contexts/ToastContext';

type RealizeFn = () => Promise<{ success: boolean; message?: string }>;

/**
 * Hook opakowujący akcje realize / unrealize wspólnym wzorcem toast + refresh.
 *
 * Używany w ChatDetailsPage i ChatsViewPage, aby uniknąć duplikacji
 * identycznych callbacków handleRealize / handleUnrealize.
 *
 * @param realize - funkcja potwierdzenia realizacji (z useRealizationActions lub useChatsViewState)
 * @param unrealize - funkcja cofnięcia realizacji
 * @param onSuccess - opcjonalny callback wywoływany po udanej akcji (np. refetch)
 */
export function useRealizationHandlers(realize: RealizeFn, unrealize: RealizeFn, onSuccess?: () => void) {
  const { push: pushToast } = useToast();

  const handleRealize = useCallback(async () => {
    const result = await realize();
    if (result.success) {
      pushToast({
        type: 'success',
        text: result.message ?? 'Potwierdzono realizację wymiany',
      });
      onSuccess?.();
    } else {
      pushToast({
        type: 'error',
        text: result.message ?? 'Nie udało się potwierdzić realizacji',
      });
    }
  }, [realize, pushToast, onSuccess]);

  const handleUnrealize = useCallback(async () => {
    const result = await unrealize();
    if (result.success) {
      pushToast({
        type: 'success',
        text: result.message ?? 'Cofnięto potwierdzenie realizacji',
      });
      onSuccess?.();
    } else {
      pushToast({
        type: 'error',
        text: result.message ?? 'Nie udało się cofnąć potwierdzenia',
      });
    }
  }, [unrealize, pushToast, onSuccess]);

  return { handleRealize, handleUnrealize };
}
