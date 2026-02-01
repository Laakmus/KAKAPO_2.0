import React from 'react';
import { Card } from './ui/card';

/**
 * Props dla ProfileStats
 */
type ProfileStatsProps = {
  email: string;
  createdAt: string;
  activeOffersCount: number;
};

/**
 * Sekcja statystyk profilu
 *
 * Wyświetla:
 * - Email (read-only)
 * - Data rejestracji (sformatowana)
 * - Liczba aktywnych ofert (z opcjonalnym linkiem do /offers/my)
 */
export function ProfileStats({ email, createdAt, activeOffersCount }: ProfileStatsProps) {
  // Formatowanie daty rejestracji
  const formattedDate = new Date(createdAt).toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Card data-testid="profile-stats" className="p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Informacje o koncie</h2>

      <div className="space-y-3">
        {/* Email */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
          <span className="text-sm font-medium text-muted-foreground w-40">Email:</span>
          <span className="text-sm">{email}</span>
        </div>

        {/* Data rejestracji */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
          <span className="text-sm font-medium text-muted-foreground w-40">Data rejestracji:</span>
          <span className="text-sm">{formattedDate}</span>
        </div>

        {/* Liczba aktywnych ofert */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
          <span className="text-sm font-medium text-muted-foreground w-40">Aktywne oferty:</span>
          <a href="/offers/my" className="text-sm text-primary hover:underline font-medium">
            {activeOffersCount} {activeOffersCount === 1 ? 'oferta' : 'ofert'}
          </a>
        </div>
      </div>
    </Card>
  );
}
