import { render, screen } from '@testing-library/react';
import { OfferCard } from '@/components/OfferCard';
import type { OfferListItemViewModel } from '@/types';

describe('OfferCard', () => {
  const createOffer = (overrides: Partial<OfferListItemViewModel> = {}): OfferListItemViewModel => ({
    id: 'offer-1',
    title: 'Super oferta',
    description: 'Opis oferty',
    image_url: null,
    thumbnail_url: null,
    city: 'Warszawa',
    status: 'ACTIVE',
    created_at: new Date('2025-01-15T10:00:00Z').toISOString(),
    owner_id: 'user-1',
    owner_name: 'Jan Kowalski',
    interests_count: 2,
    images_count: 0,
    isOwnOffer: false,
    ...overrides,
  });

  it('renders link to offer details page', () => {
    const offer = createOffer();

    render(<OfferCard offer={offer} />);

    const link = screen.getByRole('link', { name: 'Zobacz szczegóły' });
    expect(link).toHaveAttribute('href', '/offers/offer-1');
  });

  it('truncates description to 120 chars + ellipsis', () => {
    const long = 'a'.repeat(130);
    const offer = createOffer({ description: long });

    render(<OfferCard offer={offer} />);

    const expected = long.substring(0, 120).trim() + '...';
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('falls back to "Nieznany oferent" when owner_name is missing', () => {
    const offer = createOffer({ owner_name: undefined });
    render(<OfferCard offer={offer} />);

    expect(screen.getByText('Nieznany oferent')).toBeInTheDocument();
  });

  it('hides interests counter for own offers', () => {
    const offer = createOffer({ isOwnOffer: true, interests_count: 7 });
    render(<OfferCard offer={offer} />);

    expect(screen.queryByText(/zainteresowan/i)).not.toBeInTheDocument();
  });

  it('shows images badge only when imagesCount > 1', () => {
    const offerWithMany = createOffer({ images_count: 3, image_url: 'https://example.com/a.jpg' });
    render(<OfferCard offer={offerWithMany} />);
    expect(screen.getByLabelText('3 zdjęć')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
