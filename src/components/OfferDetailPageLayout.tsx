import { AuthenticatedLayout } from './AuthenticatedLayout';
import { OffersPageShell } from './OffersPageShell';

/**
 * Props dla OfferDetailPageLayout
 */
export type OfferDetailPageLayoutProps = {
  currentPath: string;
  initialToken?: string;
  offerId: string;
};

/**
 * Layout dedykowany dla strony szczegółów oferty
 *
 * Łączy AuthenticatedLayout z OffersPageShell w jednej React island,
 * aby zapewnić dostęp do AuthProvider context.
 */
export function OfferDetailPageLayout({ currentPath, initialToken, offerId }: OfferDetailPageLayoutProps) {
  return (
    <AuthenticatedLayout currentPath={currentPath} initialToken={initialToken}>
      <OffersPageShell offerId={offerId} />
    </AuthenticatedLayout>
  );
}
