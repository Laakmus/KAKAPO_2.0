import { AuthenticatedLayout } from './AuthenticatedLayout';
import { MyOffersPage } from './MyOffersPage';

/**
 * Props dla MyOffersPageLayout
 */
export type MyOffersPageLayoutProps = {
  currentPath: string;
  initialToken?: string;
};

/**
 * Layout dedykowany dla strony Moje Oferty
 *
 * Łączy AuthenticatedLayout z MyOffersPage w jednej React island,
 * aby zapewnić dostęp do AuthProvider context.
 */
export function MyOffersPageLayout({ currentPath, initialToken }: MyOffersPageLayoutProps) {
  return (
    <AuthenticatedLayout currentPath={currentPath} initialToken={initialToken}>
      <MyOffersPage />
    </AuthenticatedLayout>
  );
}
