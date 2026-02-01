import React from 'react';
import type { HomeFilterState } from '@/types';
import { ALLOWED_CITIES } from '@/schemas/offers.schema';
import { Button } from './ui/button';
import { Card } from './ui/card';

/**
 * Props dla OffersFilterPanel
 */
type OffersFilterPanelProps = {
  values: HomeFilterState;
  onChange: (values: HomeFilterState) => void;
  isLoading?: boolean;
};

/**
 * Panel filtrujący oferty
 *
 * Funkcjonalności:
 * - Wybór miasta (16 miast)
 * - Sortowanie (data/tytuł)
 * - Kierunek sortowania (asc/desc)
 * - Przycisk wyczyszczenia filtrów
 */
export function OffersFilterPanel({ values, onChange, isLoading = false }: OffersFilterPanelProps) {
  /**
   * Handler zmiany miasta
   */
  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const city = e.target.value || undefined;
    onChange({ ...values, city });
  };

  /**
   * Handler zmiany sortowania
   */
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sort = e.target.value as 'created_at' | 'title';
    onChange({ ...values, sort });
  };

  /**
   * Handler zmiany kierunku
   */
  const handleOrderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const order = e.target.value as 'asc' | 'desc';
    onChange({ ...values, order });
  };

  /**
   * Handler wyczyszczenia filtrów
   */
  const handleClear = () => {
    onChange({
      city: undefined,
      sort: 'created_at',
      order: 'desc',
    });
  };

  const hasFilters = values.city || values.sort !== 'created_at' || values.order !== 'desc';

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        {/* Filtry */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center flex-1">
          {/* Miasto */}
          <div className="flex flex-col gap-1 sm:w-48">
            <label htmlFor="city-filter" className="text-sm font-medium">
              Miasto
            </label>
            <select
              id="city-filter"
              data-testid="offers-filter-city"
              value={values.city || ''}
              onChange={handleCityChange}
              disabled={isLoading}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="">Wszystkie miasta</option>
              {ALLOWED_CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          {/* Sortowanie */}
          <div className="flex flex-col gap-1 sm:w-40">
            <label htmlFor="sort-filter" className="text-sm font-medium">
              Sortuj według
            </label>
            <select
              id="sort-filter"
              data-testid="offers-filter-sort"
              value={values.sort}
              onChange={handleSortChange}
              disabled={isLoading}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="created_at">Data dodania</option>
              <option value="title">Tytuł</option>
            </select>
          </div>

          {/* Kierunek */}
          <div className="flex flex-col gap-1 sm:w-40">
            <label htmlFor="order-filter" className="text-sm font-medium">
              Kolejność
            </label>
            <select
              id="order-filter"
              data-testid="offers-filter-order"
              value={values.order}
              onChange={handleOrderChange}
              disabled={isLoading}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="desc">Malejąco</option>
              <option value="asc">Rosnąco</option>
            </select>
          </div>
        </div>

        {/* Akcje */}
        <div className="flex gap-2">
          {hasFilters && (
            <Button
              data-testid="offers-filter-clear"
              type="button"
              variant="outline"
              onClick={handleClear}
              disabled={isLoading}
            >
              Wyczyść
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
