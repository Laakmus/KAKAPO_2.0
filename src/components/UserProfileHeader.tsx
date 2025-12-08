import React from 'react';
import { Card } from './ui/card';

/**
 * Props dla UserProfileHeader
 */
export type UserProfileHeaderProps = {
  firstName: string;
  lastName: string;
  activeOffersCount: number;
};

/**
 * Komponent nagłówka profilu użytkownika
 *
 * Wyświetla:
 * - Imię i nazwisko użytkownika
 * - Liczbę aktywnych ofert
 * - Placeholder awatara (przyszłe rozszerzenie)
 *
 * @param props - Props komponentu
 */
export const UserProfileHeader = React.memo(function UserProfileHeader({
  firstName,
  lastName,
  activeOffersCount,
}: UserProfileHeaderProps) {
  const fullName = `${firstName} ${lastName}`;

  return (
    <Card className="p-6 mb-6" role="region" aria-label="Profil użytkownika">
      <div className="flex items-start gap-4">
        {/* Avatar placeholder */}
        <div
          className="flex-shrink-0 w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center"
          aria-hidden="true"
        >
          <span className="text-2xl font-bold text-primary">
            {firstName.charAt(0)}
            {lastName.charAt(0)}
          </span>
        </div>

        {/* Informacje o użytkowniku */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-2" id="user-name">
            {fullName}
          </h1>

          {/* Statystyki */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div
              className="flex items-center gap-1"
              role="status"
              aria-label={`Liczba aktywnych ofert: ${activeOffersCount}`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <span>
                {activeOffersCount} {activeOffersCount === 1 ? 'aktywna oferta' : 'aktywnych ofert'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
});
