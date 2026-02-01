import { render, screen } from '@testing-library/react';
import { OffersGrid } from '@/components/OffersGrid';
import type { OfferListItemViewModel } from '@/types';

const mocks = vi.hoisted(() => ({
  OfferCard: vi.fn(),
}));

vi.mock('@/components/OfferCard', () => ({
  OfferCard: (props: { offer: OfferListItemViewModel }) => {
    mocks.OfferCard(props);
    return <div data-testid={`offer-card-${props.offer.id}`}>{props.offer.title}</div>;
  },
}));

describe('OffersGrid', () => {
  beforeEach(() => {
    mocks.OfferCard.mockClear();
  });

  it('renders an OfferCard for each offer', () => {
    const offers: OfferListItemViewModel[] = [
      {
        id: 'o1',
        title: 'Oferta 1',
        description: 'Opis',
        image_url: null,
        city: 'Gdańsk',
        status: 'ACTIVE',
        created_at: new Date('2025-01-01').toISOString(),
        owner_id: 'u1',
        owner_name: 'Jan',
        interests_count: 0,
        isOwnOffer: false,
      },
      {
        id: 'o2',
        title: 'Oferta 2',
        description: 'Opis',
        image_url: null,
        city: 'Warszawa',
        status: 'ACTIVE',
        created_at: new Date('2025-01-02').toISOString(),
        owner_id: 'u2',
        owner_name: 'Anna',
        interests_count: 2,
        isOwnOffer: false,
      },
    ];

    render(<OffersGrid offers={offers} />);

    expect(screen.getByTestId('offer-card-o1')).toBeInTheDocument();
    expect(screen.getByTestId('offer-card-o2')).toBeInTheDocument();
    expect(screen.getByText('Oferta 1')).toBeInTheDocument();
    expect(screen.getByText('Oferta 2')).toBeInTheDocument();

    expect(mocks.OfferCard).toHaveBeenCalledTimes(2);
    expect(mocks.OfferCard.mock.calls[0][0].offer.id).toBe('o1');
    expect(mocks.OfferCard.mock.calls[1][0].offer.id).toBe('o2');
  });

  it('renders empty grid when no offers provided', () => {
    const { container } = render(<OffersGrid offers={[]} />);

    expect(container.querySelector('.grid')).toBeInTheDocument();
    expect(mocks.OfferCard).not.toHaveBeenCalled();
  });
});
