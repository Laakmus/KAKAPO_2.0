import { useState } from 'react';
import { OfferForm } from './OfferForm';
import { GlobalNotification } from './GlobalNotification';
import type { CreateOfferResponse, ApiErrorResponse, NotificationMessage } from '@/types';

/**
 * Komponent OffersNewPage
 *
 * Strona dodawania nowej oferty barterowej.
 *
 * Funkcjonalności:
 * - Wyświetla nagłówek i instrukcje
 * - Renderuje OfferForm z walidacją
 * - Obsługuje komunikaty sukcesu/błędu (GlobalNotification)
 * - Przekierowuje do /offers/{id} po sukcesie
 *
 * Routing: /offers/new (chroniona trasa)
 *
 * Wymagania:
 * - Użytkownik musi być zalogowany (weryfikowane przez ProtectedLayout)
 * - Formularz waliduje dane zgodnie z createOfferSchema
 * - Po sukcesie: komunikat "Oferta dodana pomyślnie!" + przekierowanie
 * - Po błędzie: komunikat z opisem błędu (lub mapowanie na pola formularza)
 */
export function OffersNewPage() {
  const [notification, setNotification] = useState<NotificationMessage | undefined>();

  /**
   * Handler sukcesu - wyświetl notyfikację i przekieruj
   */
  const handleSuccess = (_offer: CreateOfferResponse) => {
    setNotification({
      type: 'success',
      text: 'Oferta dodana pomyślnie! Za chwilę zostaniesz przekierowany...',
    });

    // Przekierowanie obsługuje OfferForm (po 1s)
  };

  /**
   * Handler błędu - wyświetl notyfikację (jeśli nie jest błędem pola)
   */
  const handleError = (error: ApiErrorResponse | string) => {
    // Jeśli błąd to string (ogólny błąd), wyświetl notyfikację
    if (typeof error === 'string') {
      setNotification({
        type: 'error',
        text: error,
      });
      return;
    }

    // Jeśli błąd ma details.field, to jest obsługiwany przez formularz
    // Wyświetl notyfikację tylko jeśli to ogólny błąd (nie ma field)
    if (!error.error?.details?.field) {
      setNotification({
        type: 'error',
        text: error.error?.message || 'Wystąpił błąd podczas tworzenia oferty.',
      });
    }
  };

  /**
   * Zamknij notyfikację
   */
  const handleCloseNotification = () => {
    setNotification(undefined);
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Nagłówek */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dodaj nową ofertę</h1>
        <p className="text-base text-gray-600">
          Wypełnij formularz poniżej, aby dodać swoją ofertę barterową. Pola oznaczone{' '}
          <span className="text-red-500">*</span> są wymagane.
        </p>
      </div>

      {/* Globalna notyfikacja */}
      {notification && (
        <div className="mb-6">
          <GlobalNotification message={notification} onClose={handleCloseNotification} />
        </div>
      )}

      {/* Instrukcje walidacji */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h2 className="text-sm font-semibold text-blue-900 mb-2">Wymagania dotyczące oferty:</h2>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Tytuł: od 5 do 100 znaków</li>
          <li>Opis: od 10 do 5000 znaków</li>
          <li>URL zdjęcia: opcjonalny, musi być poprawnym linkiem (JPG, PNG, WebP)</li>
          <li>Miasto: wybierz jedno z dostępnych miast</li>
        </ul>
      </div>

      {/* Formularz */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <OfferForm onSuccess={handleSuccess} onError={handleError} />
      </div>
    </div>
  );
}
