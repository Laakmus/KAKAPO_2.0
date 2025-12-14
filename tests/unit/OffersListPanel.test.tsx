import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OffersListPanel } from '@/components/OffersListPanel';

const mocks = vi.hoisted(() => ({
  useOffersList: vi.fn(),
  refetch: vi.fn(),
  onSelect: vi.fn(),
  onPageChange: vi.fn(),
}));

vi.mock('@/hooks/useOffersList', () => ({
  useOffersList: mocks.useOffersList,
}));

describe('OffersListPanel', () => {
  beforeEach(() => {
    mocks.useOffersList.mockReset();
    mocks.refetch.mockReset();
    mocks.onSelect.mockReset();
    mocks.onPageChange.mockReset();
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

  it('renders list and calls onSelect with offer id when clicking an offer card', async () => {
    const user = userEvent.setup();

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
    expect(screen.getByText('Laptop')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Oferta: Rower przez Jan' }));

    expect(mocks.onSelect).toHaveBeenCalledWith('o1');
  });
});
