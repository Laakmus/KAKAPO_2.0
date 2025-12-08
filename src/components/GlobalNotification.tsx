import type { NotificationMessage, LoginNotificationMessage } from '@/types';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * Props dla komponentu GlobalNotification
 */
type GlobalNotificationProps = {
  /**
   * Wiadomość do wyświetlenia (zawiera typ i tekst)
   * Może zawierać opcjonalne pola CTA (actionLabel, actionHref, actionOnClick)
   */
  message?: NotificationMessage | LoginNotificationMessage;
  /**
   * Alternatywna nazwa propa - dla kompatybilności
   */
  notification?: NotificationMessage | LoginNotificationMessage;
  /**
   * Callback wywoływany przy zamknięciu notyfikacji
   */
  onClose?: () => void;
  /**
   * Dodatkowe klasy CSS
   */
  className?: string;
};

/**
 * Komponent GlobalNotification
 *
 * Wyświetla globalną notyfikację (success/error) z odpowiednią semantyką ARIA
 * dla dostępności (screen readers).
 *
 * Kluczowe cechy:
 * - aria-live="polite" - ogłasza zmiany dla screen readers
 * - role="status" - określa typ regionu
 * - Wizualne ikony dla typu wiadomości
 * - Warunkowe stylowanie (success = zielony, error = czerwony)
 *
 * @param props - Props komponentu
 */
export function GlobalNotification({ message, notification, onClose, className = '' }: GlobalNotificationProps) {
  // Użyj message lub notification (kompatybilność)
  const displayMessage = message || notification;

  // Nie renderuj nic jeśli nie ma wiadomości
  if (!displayMessage) {
    return null;
  }

  const isSuccess = displayMessage.type === 'success';

  // Określ style na podstawie typu wiadomości
  const baseStyles = 'flex items-start gap-3 p-4 rounded-lg border';
  const typeStyles = isSuccess
    ? 'bg-green-50 border-green-200 text-green-900'
    : 'bg-red-50 border-red-200 text-red-900';

  const Icon = isSuccess ? CheckCircle2 : AlertCircle;
  const iconColor = isSuccess ? 'text-green-600' : 'text-red-600';

  // Sprawdź czy wiadomość ma CTA (actionLabel/actionHref/actionOnClick)
  const hasAction = 'actionLabel' in displayMessage && displayMessage.actionLabel;
  const actionLabel =
    hasAction && typeof (displayMessage as LoginNotificationMessage).actionLabel === 'string'
      ? (displayMessage as LoginNotificationMessage).actionLabel
      : undefined;
  const actionHref = hasAction ? (displayMessage as LoginNotificationMessage).actionHref : undefined;
  const actionOnClick = hasAction ? (displayMessage as LoginNotificationMessage).actionOnClick : undefined;

  return (
    <div role="status" aria-live="polite" aria-atomic="true" className={`${baseStyles} ${typeStyles} ${className}`}>
      {/* Ikona */}
      <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${iconColor}`} aria-hidden="true" />

      {/* Treść wiadomości */}
      <div className="flex-1">
        <p className="text-sm font-medium leading-relaxed">{displayMessage.text}</p>

        {/* Opcjonalny CTA (Call To Action) */}
        {actionLabel && (
          <div className="mt-3">
            {actionHref ? (
              // Link CTA
              <a
                href={actionHref}
                className="inline-flex items-center text-sm font-semibold underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                {actionLabel}
              </a>
            ) : actionOnClick ? (
              // Button CTA
              <button
                type="button"
                onClick={actionOnClick}
                className="inline-flex items-center text-sm font-semibold underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                {actionLabel}
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* Przycisk zamknięcia (opcjonalny) */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="flex-shrink-0 ml-2 text-current opacity-70 hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary rounded"
          aria-label="Zamknij powiadomienie"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
