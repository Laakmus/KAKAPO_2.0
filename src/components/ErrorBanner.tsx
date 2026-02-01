import React from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';

/**
 * Props dla ErrorBanner
 */
type ErrorBannerProps = {
  message: string;
  onRetry: () => void;
  isAuthError?: boolean;
};

/**
 * Komponent komunikatu błędu
 *
 * Funkcjonalności:
 * - Wyświetla komunikat błędu
 * - Przycisk Retry
 * - Dla błędów 401/403 - link do logowania
 */
export function ErrorBanner({ message, onRetry, isAuthError = false }: ErrorBannerProps) {
  return (
    <Card className="p-6 border-destructive bg-destructive/10">
      <div className="flex flex-col gap-4">
        {/* Ikona błędu */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-1">
              {isAuthError ? 'Wymagana jest autoryzacja' : 'Wystąpił błąd'}
            </h3>
            <p className="text-muted-foreground">{message}</p>
          </div>
        </div>

        {/* Akcje */}
        <div className="flex gap-2">
          {isAuthError ? (
            <Button asChild variant="default">
              <a href="/login">Zaloguj się</a>
            </Button>
          ) : (
            <Button onClick={onRetry} variant="default">
              Spróbuj ponownie
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
