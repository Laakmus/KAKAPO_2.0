import React from 'react';

/**
 * Komponent SkipToContent
 *
 * Link "Przejdź do treści" dla użytkowników korzystających z klawiatury.
 * Niewidoczny dopóki nie otrzyma focus.
 *
 * Kluczowe cechy dostępności:
 * - Widoczny tylko przy focus (focus:not-sr-only)
 * - Pozwala pominąć nawigację i przejść bezpośrednio do treści
 * - Wymaga ID="main-content" na kontenerze treści
 *
 * @returns Link do pominięcia nawigacji
 */
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
    >
      Przejdź do treści
    </a>
  );
}
