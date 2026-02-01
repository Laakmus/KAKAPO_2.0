import { AuthenticatedLayout } from './AuthenticatedLayout';
import { HomeOffersPage } from './HomeOffersPage';

/**
 * Props dla HomeOffersPageLayout
 */
export type HomeOffersPageLayoutProps = {
  currentPath: string;
  initialToken?: string;
};

/**
 * Layout dedykowany dla strony Home - lista ofert
 *
 * Łączy AuthenticatedLayout z HomeOffersPage w jednej React island,
 * aby zapewnić dostęp do AuthProvider context.
 */
export function HomeOffersPageLayout({ currentPath, initialToken }: HomeOffersPageLayoutProps) {
  return (
    <AuthenticatedLayout currentPath={currentPath} initialToken={initialToken}>
      <HomeOffersPage />
    </AuthenticatedLayout>
  );
}
