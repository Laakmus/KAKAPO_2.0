import { type ReactNode } from 'react';
import { LoadingSkeleton } from './LoadingSkeleton';

/**
 * Props dla MainContentContainer
 */
export type MainContentContainerProps = {
  children: ReactNode;
  isLoading?: boolean;
};

/**
 * Komponent MainContentContainer
 *
 * Kontener main dla aktualnie renderowanego widoku.
 * Obsługuje:
 * - Wyświetlanie zawartości (children)
 * - Stan ładowania (opcjonalny skeleton/spinner)
 * - Semantyczne znaczniki HTML (main, role="main")
 *
 * Kluczowe cechy:
 * - role="main" dla dostępności
 * - Responsywne padding i max-width
 * - Obsługa stanu ładowania z LoadingSkeleton
 *
 * @param props - Props komponentu
 */
export function MainContentContainer({ children, isLoading = false }: MainContentContainerProps) {
  return (
    <main role="main" id="main-content" className="flex-1 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? <LoadingSkeleton variant="default" /> : children}
      </div>
    </main>
  );
}
