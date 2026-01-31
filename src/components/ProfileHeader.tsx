import React from 'react';
import { Avatar } from './ui/avatar';

/**
 * Props dla ProfileHeader
 */
type ProfileHeaderProps = {
  firstName: string;
  lastName: string;
  avatarUrl?: string;
};

/**
 * Nagłówek profilu użytkownika
 *
 * Wyświetla:
 * - Avatar (placeholder)
 * - Imię i nazwisko jako h1
 */
export function ProfileHeader({ firstName, lastName, avatarUrl }: ProfileHeaderProps) {
  const fullName = `${firstName} ${lastName}`;
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  return (
    <div data-testid="profile-header" className="flex items-center gap-4 mb-6">
      {/* Avatar placeholder */}
      <Avatar className="h-20 w-20 bg-primary text-primary-foreground text-2xl font-semibold flex items-center justify-center">
        {avatarUrl ? (
          <img src={avatarUrl} alt={fullName} className="h-full w-full object-cover rounded-full" />
        ) : (
          <span>{initials}</span>
        )}
      </Avatar>

      {/* Heading */}
      <div>
        <h1 className="text-3xl font-bold">{fullName}</h1>
      </div>
    </div>
  );
}
