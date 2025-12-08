import { useState, useEffect, useCallback } from 'react';

/**
 * Hook do synchronizacji paginacji z URL
 *
 * Funkcjonalności:
 * - Odczytuje parametr 'page' z URL przy montażu
 * - Aktualizuje URL (history.replaceState) przy zmianie strony
 * - Zapewnia, że strona >= 1
 *
 * @param initialPage - początkowa strona (domyślnie 1)
 */
export function useUrlPagination(initialPage = 1) {
  const [page, setPageState] = useState(() => {
    // Odczytaj z URL przy inicjalizacji
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const pageParam = params.get('page');
      const parsedPage = pageParam ? parseInt(pageParam, 10) : initialPage;
      return parsedPage >= 1 ? parsedPage : initialPage;
    }
    return initialPage;
  });

  /**
   * Ustawia nowy numer strony i synchronizuje z URL
   */
  const setPage = useCallback((newPage: number) => {
    if (newPage < 1) return;

    setPageState(newPage);

    // Aktualizuj URL
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (newPage === 1) {
        params.delete('page');
      } else {
        params.set('page', newPage.toString());
      }

      const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;

      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  /**
   * Nasłuchuj zmiany URL (back/forward)
   */
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const pageParam = params.get('page');
      const parsedPage = pageParam ? parseInt(pageParam, 10) : 1;
      setPageState(parsedPage >= 1 ? parsedPage : 1);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return { page, setPage };
}
