import { Button } from './ui/button';
import { Card } from './ui/card';

/**
 * Props dla EmptyState
 */
type EmptyStateProps = {
  title?: string;
  description?: string;
  onRefresh: () => void;
  searchQuery?: string;
};

/**
 * Komponent stanu pustej listy
 *
 * Wyświetlany gdy brak ofert pasujących do filtrów lub wyszukiwania
 */
export function EmptyState({ title, description, onRefresh, searchQuery }: EmptyStateProps) {
  const defaultTitle = searchQuery ? `Brak wyników dla "${searchQuery}"` : 'Brak aktywnych ofert';

  const defaultDescription = searchQuery ? (
    <>
      Nie znaleziono ofert pasujących do wyszukiwania.
      <br />
      Spróbuj użyć innych słów kluczowych.
    </>
  ) : (
    <>
      Nie znaleziono ofert pasujących do wybranych filtrów.
      <br />
      Spróbuj zmienić filtry lub odśwież stronę.
    </>
  );

  return (
    <Card className="p-12 text-center">
      <div className="flex flex-col items-center gap-4">
        {/* Ikona lub ilustracja */}
        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </div>

        {/* Komunikat */}
        <div>
          <h3 className="text-xl font-semibold mb-2">{title || defaultTitle}</h3>
          <p className="text-muted-foreground mb-4">{description || defaultDescription}</p>
        </div>

        {/* CTA */}
        <Button onClick={onRefresh} variant="default">
          Odśwież
        </Button>
      </div>
    </Card>
  );
}
