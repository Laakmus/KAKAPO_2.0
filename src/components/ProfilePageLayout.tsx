import { AuthenticatedLayout } from './AuthenticatedLayout';
import { ProfilePage } from './ProfilePage';

/**
 * Props dla ProfilePageLayout
 */
export type ProfilePageLayoutProps = {
  currentPath: string;
  initialToken?: string;
  initialUser?: import('@/types').UserProfileDTO;
};

/**
 * Layout dedykowany dla strony Profil użytkownika
 *
 * Łączy AuthenticatedLayout z ProfilePage w jednej React island,
 * aby zapewnić dostęp do AuthProvider context.
 */
export function ProfilePageLayout({ currentPath, initialToken, initialUser }: ProfilePageLayoutProps) {
  return (
    <AuthenticatedLayout currentPath={currentPath} initialToken={initialToken} initialUser={initialUser}>
      <ProfilePage />
    </AuthenticatedLayout>
  );
}
