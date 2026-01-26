import { render, screen } from '@testing-library/react';
import { OffersListPanel } from '@/components/OffersListPanel';
import type { OfferListItemViewModel } from '@/types';

const mocks = vi.hoisted(() => ({
  useOffersList: vi.fn(),
  refetch: vi.fn(),
  onSelect: vi.fn(),
  onPageChange: vi.fn(),
  OfferCard: vi.fn(),
}));

vi.mock('@/hooks/useOffersList', () => ({
  useOffersList: mocks.useOffersList,
}));

vi.mock('@/components/OfferCard', () => ({
  OfferCard: (props: { offer: OfferListItemViewModel; isSelected?: boolean; onSelect?: () => void }) => {
    mocks.OfferCard(props);
    return (
      <button type="button" data-testid={`offer-card-${props.offer.id}`} onClick={props.onSelect}>
        {props.offer.title}
        {props.isSelected && ' (selected)'}
      </button>
    );
  },
}));

describe('OffersListPanel', () => {
  beforeEach(() => {
    mocks.useOffersList.mockReset();
    mocks.refetch.mockReset();
    mocks.onSelect.mockReset();
    mocks.onPageChange.mockReset();
    mocks.OfferCard.mockReset();
  });

  const filter = { sort: 'created_at', order: 'desc' } as any;

  it('renders loading skeleton when isLoading', () => {
    mocks.useOffersList.mockReturnValue({
      offers: [],
      pagination: null,
      isLoading: true,
      error: null,
      refetch: mocks.refetch,
    });

    const { container } = render(
      <OffersListPanel
        selectedOfferId=""
        onSelect={mocks.onSelect}
        filter={filter}
        page={1}
        onPageChange={mocks.onPageChange}
      />,
    );

    expect(screen.getByText('Oferty')).toBeInTheDocument();

    const skeletonCards = container.querySelectorAll('.animate-pulse');
    expect(skeletonCards.length).toBeGreaterThan(0);
  });

  it('renders auth error banner for 401/403', () => {
    mocks.useOffersList.mockReturnValue({
      offers: [],
      pagination: null,
      isLoading: false,
      error: { status: 401, error: { message: 'Brak auth' } },
      refetch: mocks.refetch,
    });

    render(
      <OffersListPanel
        selectedOfferId=""
        onSelect={mocks.onSelect}
        filter={filter}
        page={1}
        onPageChange={mocks.onPageChange}
      />,
    );

    expect(screen.getByText('Wymagana jest autoryzacja')).toBeInTheDocument();
    expect(screen.getByText('Brak auth')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Zaloguj się' })).toHaveAttribute('href', '/login');
  });

  it('renders empty state when there are no offers', () => {
    mocks.useOffersList.mockReturnValue({
      offers: [],
      pagination: null,
      isLoading: false,
      error: null,
      refetch: mocks.refetch,
    });

    render(
      <OffersListPanel
        selectedOfferId=""
        onSelect={mocks.onSelect}
        filter={filter}
        page={1}
        onPageChange={mocks.onPageChange}
      />,
    );

    expect(screen.getByText('Brak ofert')).toBeInTheDocument();
  });

  it('renders list of offers and highlights selected one', () => {
    mocks.useOffersList.mockReturnValue({
      offers: [
        {
          id: 'o1',
          title: 'Rower',
          description: 'Opis opis opis',
          city: 'Warszawa',
          created_at: '2025-01-01T10:00:00.000Z',
          owner_id: 'u1',
          owner_name: 'Jan',
          image_url: null,
          thumbnail_url: null,
          interests_count: 2,
          images_count: 0,
          isOwnOffer: false,
        },
        {
          id: 'o2',
          title: 'Laptop',
          description: 'Opis opis opis',
          city: 'Kraków',
          created_at: '2025-01-02T10:00:00.000Z',
          owner_id: 'u2',
          owner_name: 'Ala',
          image_url: null,
          thumbnail_url: null,
          interests_count: 0,
          images_count: 0,
          isOwnOffer: true,
        },
      ],
      pagination: { page: 1, total_pages: 2, total: 2, limit: 15 },
      isLoading: false,
      error: null,
      refetch: mocks.refetch,
    });

    render(
      <OffersListPanel
        selectedOfferId="o2"
        onSelect={mocks.onSelect}
        filter={filter}
        page={1}
        onPageChange={mocks.onPageChange}
      />,
    );

    expect(screen.getByRole('list', { name: 'Lista ofert' })).toBeInTheDocument();
    expect(screen.getByText('Rower')).toBeInTheDocument();
    expect(screen.getByText('Laptop (selected)')).toBeInTheDocument();

    // Verify OfferCard received correct props
    expect(mocks.OfferCard).toHaveBeenCalledTimes(2);
    expect(mocks.OfferCard.mock.calls[0][0].isSelected).toBe(false);
    expect(mocks.OfferCard.mock.calls[1][0].isSelected).toBe(true);
  });

  it('calls onSelect when a non-selected offer is clicked', async () => {
    const user = await import('@testing-library/user-event');

    mocks.useOffersList.mockReturnValue({
      offers: [
        {
          id: 'o1',
          title: 'Rower',
          description: 'Opis',
          city: 'Warszawa',
          created_at: '2025-01-01T10:00:00.000Z',
          owner_id: 'u1',
          owner_name: 'Jan',
          image_url: null,
          thumbnail_url: null,
          interests_count: 2,
          images_count: 0,
          isOwnOffer: false,
        },
      ],
      pagination: { page: 1, total_pages: 1, total: 1, limit: 15 },
      isLoading: false,
      error: null,
      refetch: mocks.refetch,
    });

    render(
      <OffersListPanel
        selectedOfferId=""
        onSelect={mocks.onSelect}
        filter={filter}
        page={1}
        onPageChange={mocks.onPageChange}
      />,
    );

    await user.default.setup().click(screen.getByTestId('offer-card-o1'));

    expect(mocks.onSelect).toHaveBeenCalledWith('o1');
  });
});
