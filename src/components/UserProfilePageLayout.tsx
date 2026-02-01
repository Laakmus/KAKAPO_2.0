import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { UserProfileClient } from './UserProfileClient';

/**
 * Props dla UserProfilePageLayout
 */
export type UserProfilePageLayoutProps = {
  currentPath: string;
  initialToken?: string;
  userId: string;
};

/**
 * Layout dedykowany dla strony profilu użytkownika
 *
 * Łączy AuthProvider z UserProfileClient w jednej React island,
 * aby zapewnić dostęp do AuthProvider context.
 */
export function UserProfilePageLayout({ currentPath: _currentPath, initialToken, userId }: UserProfilePageLayoutProps) {
  return (
    <AuthProvider initialToken={initialToken}>
      <ToastProvider>
        <UserProfileClient userId={userId} />
      </ToastProvider>
    </AuthProvider>
  );
}
