import { ALLOWED_CITIES } from '@/schemas/offers.schema';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * Typ miasta z listy dozwolonych miast
 */
export type CityName = (typeof ALLOWED_CITIES)[number];

/**
 * Opcja miasta dla selecta
 */
export type CityOption = {
  label: string;
  value: CityName;
};

/**
 * Props dla komponentu CitySelect
 */
type CitySelectProps = {
  /**
   * Aktualna wartość (wybrane miasto)
   */
  value: CityName | '';
  /**
   * Callback wywoływany przy zmianie wartości
   */
  onChange: (value: CityName) => void;
  /**
   * Komunikat błędu (jeśli jest)
   */
  error?: string;
  /**
   * Czy pole jest wyłączone
   */
  disabled?: boolean;
  /**
   * ID pola (dla aria-describedby)
   */
  id?: string;
};

/**
 * Komponent CitySelect
 *
 * Dropdown z listą 16 dozwolonych miast z ALLOWED_CITIES.
 *
 * Funkcjonalności:
 * - Wyświetla placeholder "Wybierz miasto" gdy brak wyboru
 * - Lista miast alfabetycznie (z ALLOWED_CITIES)
 * - Walidacja: wartość musi być jednym z ALLOWED_CITIES
 * - Obsługa błędów walidacji (error prop)
 * - Dostępność: aria-invalid, aria-describedby
 *
 * @param props - Props komponentu
 */
export function CitySelect({ value, onChange, error, disabled, id = 'city' }: CitySelectProps) {
  /**
   * Opcje miast - statyczne, sortowane alfabetycznie
   */
  const cityOptions: CityOption[] = ALLOWED_CITIES.map((city) => ({
    label: city,
    value: city,
  }));

  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={(val) => onChange(val as CityName)} disabled={disabled}>
        <SelectTrigger
          id={id}
          data-testid="offer-city-select"
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={error ? 'border-red-500' : ''}
        >
          <SelectValue placeholder="Wybierz miasto" />
        </SelectTrigger>
        <SelectContent>
          {cityOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Komunikat błędu */}
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
