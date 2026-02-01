import { AuthenticatedLayout } from './AuthenticatedLayout';
import { OffersNewPage } from './OffersNewPage';

/**
 * Props dla OffersNewPageLayout
 */
export type OffersNewPageLayoutProps = {
  currentPath: string;
  initialToken?: string;
};

/**
 * Layout dedykowany dla strony dodawania nowej oferty
 *
 * Łączy AuthenticatedLayout z OffersNewPage w jednej React island,
 * aby zapewnić dostęp do AuthProvider context.
 */
export function OffersNewPageLayout({ currentPath, initialToken }: OffersNewPageLayoutProps) {
  return (
    <AuthenticatedLayout currentPath={currentPath} initialToken={initialToken}>
      <OffersNewPage />
    </AuthenticatedLayout>
  );
}
