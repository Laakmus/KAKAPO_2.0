import { AuthenticatedLayout } from './AuthenticatedLayout';
import { OffersPageShell } from './OffersPageShell';

/**
 * Props dla OfferDetailPageLayout
 */
export type OfferDetailPageLayoutProps = {
  currentPath: string;
  initialToken?: string;
  initialUser?: import('@/types').UserProfileDTO;
  offerId: string;
};

/**
 * Layout dedykowany dla strony szczegółów oferty
 *
 * Łączy AuthenticatedLayout z OffersPageShell w jednej React island,
 * aby zapewnić dostęp do AuthProvider context.
 */
export function OfferDetailPageLayout({ currentPath, initialToken, initialUser, offerId }: OfferDetailPageLayoutProps) {
  return (
    <AuthenticatedLayout currentPath={currentPath} initialToken={initialToken} initialUser={initialUser}>
      <OffersPageShell offerId={offerId} />
    </AuthenticatedLayout>
  );
}
