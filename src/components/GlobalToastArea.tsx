import React from 'react';
import { useToast, type ToastMessage } from '@/contexts/ToastContext';
import { X, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * Komponent GlobalToastArea
 *
 * Wyświetla kolejkę komunikatów toast w prawym górnym rogu ekranu.
 * Integruje się z ToastContext i obsługuje:
 * - Wyświetlanie wielu toastów jednocześnie
 * - Ręczne zamykanie toastów (przycisk X)
 * - Auto-dismiss po określonym czasie (zarządzane przez ToastContext)
 * - CTA (Call To Action) dla błędów
 *
 * Kluczowe cechy:
 * - aria-live="assertive" dla komunikatów błędów
 * - aria-live="polite" dla komunikatów sukcesu
 * - role="status"
 * - Animacje wejścia/wyjścia
 *
 * @returns Komponent z listą toastów
 */
export function GlobalToastArea() {
  const { messages, remove } = useToast();

  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-md" aria-live="polite" aria-atomic="false">
      {messages.map((message) => (
        <ToastItem key={message.id} message={message} onClose={() => remove(message.id)} />
      ))}
    </div>
  );
}

/**
 * Props dla ToastItem
 */
type ToastItemProps = {
  message: ToastMessage;
  onClose: () => void;
};

/**
 * Komponent pojedynczego toast
 */
function ToastItem({ message, onClose }: ToastItemProps) {
  const isSuccess = message.type === 'success';
  const Icon = isSuccess ? CheckCircle2 : AlertCircle;

  const baseStyles = 'flex items-start gap-3 p-4 rounded-lg border shadow-lg animate-in slide-in-from-right';
  const typeStyles = isSuccess
    ? 'bg-green-50 border-green-200 text-green-900'
    : 'bg-red-50 border-red-200 text-red-900';

  const iconColor = isSuccess ? 'text-green-600' : 'text-red-600';

  return (
    <div
      role="status"
      aria-live={isSuccess ? 'polite' : 'assertive'}
      aria-atomic="true"
      className={`${baseStyles} ${typeStyles}`}
    >
      {/* Ikona */}
      <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${iconColor}`} aria-hidden="true" />

      {/* Treść */}
      <div className="flex-1">
        <p className="text-sm font-medium leading-relaxed">{message.text}</p>

        {/* Opcjonalny CTA */}
        {message.actionLabel && message.onAction && (
          <div className="mt-3">
            <button
              type="button"
              onClick={message.onAction}
              className="inline-flex items-center text-sm font-semibold underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus-visible:ring-2 rounded-sm"
            >
              {message.actionLabel}
            </button>
          </div>
        )}
      </div>

      {/* Przycisk zamknięcia */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Zamknij powiadomienie"
        className="flex-shrink-0 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus-visible:ring-2 rounded"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
