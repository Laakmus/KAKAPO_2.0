import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HomeOffersPage } from '@/components/HomeOffersPage';
import type { ApiErrorViewModel, HomeFilterState, OfferListItemViewModel, OffersPaginationMeta } from '@/types';

const mocks = vi.hoisted(() => ({
  useOffersList: vi.fn(),
  useUrlPagination: vi.fn(),

  setPage: vi.fn(),
  refetch: vi.fn(),

  OffersSearchInput: vi.fn(),
  OffersFilterPanel: vi.fn(),
  OffersGrid: vi.fn(),
  PaginationControls: vi.fn(),
  LoadingSkeletonGrid: vi.fn(),
  EmptyState: vi.fn(),
  ErrorBanner: vi.fn(),
}));

vi.mock('@/hooks/useOffersList', () => ({
  useOffersList: mocks.useOffersList,
}));

vi.mock('@/hooks/useUrlPagination', () => ({
  useUrlPagination: mocks.useUrlPagination,
}));

vi.mock('@/components/OffersSearchInput', () => ({
  OffersSearchInput: (props: { value: string; onChange: (v: string) => void }) => {
    mocks.OffersSearchInput(props);
    return <div data-testid="OffersSearchInput" />;
  },
}));

vi.mock('@/components/OffersFilterPanel', () => ({
  OffersFilterPanel: (props: {
    values: HomeFilterState;
    onChange: (f: HomeFilterState) => void;
    onRefresh: () => void;
    isLoading: boolean;
  }) => {
    mocks.OffersFilterPanel(props);
    return (
      <div>
        <div data-testid="OffersFilterPanel" />
        <button type="button" onClick={() => props.onChange({ ...props.values, sort: 'title', order: 'asc' })}>
          change-filter
        </button>
        <button type="button" onClick={props.onRefresh}>
          refresh
        </button>
      </div>
    );
  },
}));

vi.mock('@/components/OffersGrid', () => ({
  OffersGrid: (props: { offers: OfferListItemViewModel[] }) => {
    mocks.OffersGrid(props);
    return (
      <div>
        <div data-testid="OffersGrid">{props.offers.map((o) => o.title).join(',')}</div>
      </div>
    );
  },
}));

vi.mock('@/components/PaginationControls', () => ({
  PaginationControls: (props: { pagination: OffersPaginationMeta; onPageChange: (p: number) => void }) => {
    mocks.PaginationControls(props);
    return (
      <div>
        <div data-testid="PaginationControls" />
        <button type="button" onClick={() => props.onPageChange(2)}>
          page-2
        </button>
      </div>
    );
  },
}));

vi.mock('@/components/LoadingSkeletonGrid', () => ({
  LoadingSkeletonGrid: (props: { count?: number }) => {
    mocks.LoadingSkeletonGrid(props);
    return <div data-testid="LoadingSkeletonGrid" />;
  },
}));

vi.mock('@/components/EmptyState', () => ({
  EmptyState: (props: { onRefresh: () => void; searchQuery?: string }) => {
    mocks.EmptyState(props);
    return (
      <div>
        <div data-testid="EmptyState" />
        <button type="button" onClick={props.onRefresh}>
          refresh-empty
        </button>
      </div>
    );
  },
}));

vi.mock('@/components/ErrorBanner', () => ({
  ErrorBanner: (props: { message: string; onRetry: () => void; isAuthError: boolean }) => {
    mocks.ErrorBanner(props);
    return (
      <div>
        <div data-testid="ErrorBanner">{props.message}</div>
        <button type="button" onClick={props.onRetry}>
          retry
        </button>
      </div>
    );
  },
}));

describe('HomeOffersPage', () => {
  beforeEach(() => {
    mocks.setPage.mockReset();
    mocks.refetch.mockReset();

    mocks.useUrlPagination.mockReturnValue({ page: 1, setPage: mocks.setPage });

    mocks.useOffersList.mockReturnValue({
      offers: [],
      pagination: undefined,
      isLoading: false,
      isRefreshing: false,
      error: undefined,
      refetch: mocks.refetch,
    });
  });

  it('renders auth ErrorBanner when API returns 401', () => {
    const error: ApiErrorViewModel = {
      error: { code: 'UNAUTHORIZED', message: 'Brak autoryzacji' },
      status: 401,
    };

    mocks.useOffersList.mockReturnValue({
      offers: [],
      pagination: undefined,
      isLoading: false,
      isRefreshing: false,
      error,
      refetch: mocks.refetch,
    });

    render(<HomeOffersPage />);

    expect(screen.getByTestId('ErrorBanner')).toHaveTextContent('Brak autoryzacji');
    expect(mocks.ErrorBanner.mock.calls[0][0].isAuthError).toBe(true);
  });

  it('renders LoadingSkeletonGrid when loading (and not refreshing)', () => {
    mocks.useOffersList.mockReturnValue({
      offers: [],
      pagination: undefined,
      isLoading: true,
      isRefreshing: false,
      error: undefined,
      refetch: mocks.refetch,
    });

    render(<HomeOffersPage />);

    expect(screen.getByTestId('LoadingSkeletonGrid')).toBeInTheDocument();
  });

  it('renders EmptyState and refresh triggers refetch', async () => {
    const user = userEvent.setup();

    render(<HomeOffersPage />);

    expect(screen.getByTestId('EmptyState')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'refresh-empty' }));

    expect(mocks.refetch).toHaveBeenCalledTimes(1);
  });

  it('renders OffersGrid with offers and supports pagination with scrollTo', async () => {
    const user = userEvent.setup();

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
        interests_count: 1,
        isOwnOffer: false,
      },
    ];

    mocks.useOffersList.mockReturnValue({
      offers,
      pagination: { page: 1, limit: 15, total: 20, total_pages: 2 },
      isLoading: false,
      isRefreshing: false,
      error: undefined,
      refetch: mocks.refetch,
    });

    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    render(<HomeOffersPage />);

    expect(screen.getByTestId('OffersGrid')).toHaveTextContent('Oferta 1');

    await user.click(screen.getByRole('button', { name: 'page-2' }));

    expect(mocks.setPage).toHaveBeenCalledWith(2);
    expect(scrollToSpy).toHaveBeenCalled();

    scrollToSpy.mockRestore();
  });

  it('filter change resets to page 1', async () => {
    const user = userEvent.setup();

    render(<HomeOffersPage />);

    await user.click(screen.getByRole('button', { name: 'change-filter' }));
    expect(mocks.setPage).toHaveBeenCalledWith(1);

    // Ensure state update cycle has no unexpected throws
    await waitFor(() => expect(mocks.OffersFilterPanel).toHaveBeenCalled());
  });
});
