import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OffersGrid } from '@/components/OffersGrid';
import type { OfferListItemViewModel } from '@/types';

const mocks = vi.hoisted(() => ({
  OfferCard: vi.fn(),
}));

vi.mock('@/components/OfferCard', () => ({
  OfferCard: (props: {
    offer: OfferListItemViewModel;
    isSelected?: boolean;
    onSelect: (offer: OfferListItemViewModel) => void;
  }) => {
    mocks.OfferCard(props);
    return (
      <button type="button" onClick={() => props.onSelect(props.offer)}>
        {props.offer.title} {props.isSelected ? '(selected)' : ''}
      </button>
    );
  },
}));

describe('OffersGrid', () => {
  it('renders an OfferCard for each offer and passes selection flag', () => {
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

    render(<OffersGrid offers={offers} selectedOfferId="o2" onSelectOffer={() => {}} />);

    expect(screen.getByRole('button', { name: /Oferta 1/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Oferta 2 \(selected\)/ })).toBeInTheDocument();

    expect(mocks.OfferCard).toHaveBeenCalledTimes(2);
    expect(mocks.OfferCard.mock.calls[0][0].isSelected).toBe(false);
    expect(mocks.OfferCard.mock.calls[1][0].isSelected).toBe(true);
  });

  it('calls onSelectOffer when a card is clicked', async () => {
    const user = userEvent.setup();
    const onSelectOffer = vi.fn();

    const offer: OfferListItemViewModel = {
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
    };

    render(<OffersGrid offers={[offer]} onSelectOffer={onSelectOffer} />);

    await user.click(screen.getByRole('button', { name: /Oferta 1/ }));
    expect(onSelectOffer).toHaveBeenCalledWith(offer);
  });
});
