import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type OffersSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
};

/**
 * Komponent wyszukiwania ofert z debounce
 *
 * Funkcjonalność:
 * - Pole input z ikoną lupy
 * - Przycisk "X" do czyszczenia (widoczny gdy jest tekst)
 * - Debounce (domyślnie 300ms) dla optymalizacji zapytań
 * - Instant search podczas pisania
 */
export function OffersSearchInput({
  value,
  onChange,
  placeholder = 'Szukaj ofert...',
  debounceMs = 300,
}: OffersSearchInputProps) {
  const [localValue, setLocalValue] = useState(value);

  // Synchronizuj localValue z zewnętrznym value (gdy się zmieni z zewnątrz)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced onChange
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, value, onChange, debounceMs]);

  const handleClear = useCallback(() => {
    setLocalValue('');
    onChange('');
  }, [onChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  };

  return (
    <div className="relative w-full">
      {/* Ikona lupy */}
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />

      {/* Input */}
      <Input
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="pl-10 pr-10 h-12 text-base"
      />

      {/* Przycisk X do czyszczenia */}
      {localValue && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleClear}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
          aria-label="Wyczyść wyszukiwanie"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
