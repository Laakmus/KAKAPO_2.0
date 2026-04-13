import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { UserProfileClient } from './UserProfileClient';

/**
 * Props dla UserProfilePageLayout
 */
export type UserProfilePageLayoutProps = {
  currentPath: string;
  initialToken?: string;
  initialUser?: import('@/types').UserProfileDTO;
  userId: string;
};

/**
 * Layout dedykowany dla strony profilu użytkownika
 *
 * Łączy AuthProvider z UserProfileClient w jednej React island,
 * aby zapewnić dostęp do AuthProvider context.
 */
export function UserProfilePageLayout({
  currentPath: _currentPath,
  initialToken,
  initialUser,
  userId,
}: UserProfilePageLayoutProps) {
  return (
    <AuthProvider initialToken={initialToken} initialUser={initialUser}>
      <ToastProvider>
        <UserProfileClient userId={userId} />
      </ToastProvider>
    </AuthProvider>
  );
}
