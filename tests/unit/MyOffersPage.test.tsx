import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyOffersPage } from '@/components/MyOffersPage';
import type { ApiErrorViewModel, OfferListItemDTO, UpdateOfferCommand } from '@/types';

const mocks = vi.hoisted(() => ({
  useMyOffers: vi.fn(),
  useOfferActions: vi.fn(),
  useToast: vi.fn(),

  refetch: vi.fn(),
  updateOffer: vi.fn(),
  deleteOffer: vi.fn(),
  isLoadingAction: vi.fn(),
  pushToast: vi.fn(),

  LoadingSkeletonGrid: vi.fn(),
  ErrorBanner: vi.fn(),
  OfferEditForm: vi.fn(),
  DeleteConfirmationDialog: vi.fn(),
  InterestListPanel: vi.fn(),
}));

vi.mock('@/hooks/useMyOffers', () => ({
  useMyOffers: mocks.useMyOffers,
}));

vi.mock('@/hooks/useOfferActions', () => ({
  useOfferActions: mocks.useOfferActions,
}));

vi.mock('@/contexts/ToastContext', () => ({
  useToast: mocks.useToast,
}));

vi.mock('@/components/LoadingSkeletonGrid', () => ({
  LoadingSkeletonGrid: (props: { count?: number }) => {
    mocks.LoadingSkeletonGrid(props);
    return <div data-testid="LoadingSkeletonGrid" />;
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

vi.mock('@/components/OfferEditForm', () => ({
  OfferEditForm: (props: {
    offer: OfferListItemDTO;
    onSubmit: (payload: UpdateOfferCommand) => Promise<void> | void;
    onCancel: () => void;
    isSubmitting: boolean;
  }) => {
    mocks.OfferEditForm(props);
    return (
      <div data-testid="OfferEditForm">
        <button type="button" onClick={() => props.onSubmit({ title: 'Nowy tytuł' })}>
          save
        </button>
        <button type="button" onClick={props.onCancel}>
          cancel
        </button>
      </div>
    );
  },
}));

vi.mock('@/components/DeleteConfirmationDialog', () => ({
  DeleteConfirmationDialog: (props: {
    isOpen: boolean;
    offerTitle: string;
    onCancel: () => void;
    onConfirm: () => Promise<void> | void;
    isDeleting: boolean;
  }) => {
    mocks.DeleteConfirmationDialog(props);
    if (!props.isOpen) return null;
    return (
      <div data-testid="DeleteConfirmationDialog">
        <div>{props.offerTitle}</div>
        <button type="button" onClick={props.onConfirm}>
          confirm-delete
        </button>
        <button type="button" onClick={props.onCancel}>
          cancel-delete
        </button>
      </div>
    );
  },
}));

vi.mock('@/components/InterestListPanel', () => ({
  InterestListPanel: (props: { offerId: string | null; isOpen: boolean; onClose: () => void }) => {
    mocks.InterestListPanel(props);
    return props.isOpen ? <div data-testid="InterestListPanel">{props.offerId}</div> : null;
  },
}));

describe('MyOffersPage', () => {
  const offer: OfferListItemDTO = {
    id: 'o1',
    title: 'Moja oferta',
    description: 'Opis',
    image_url: null,
    city: 'Gdańsk',
    status: 'ACTIVE',
    created_at: new Date('2025-01-01').toISOString(),
    owner_id: 'u1',
    interests_count: 2,
  };

  beforeEach(() => {
    mocks.refetch.mockReset();
    mocks.updateOffer.mockReset();
    mocks.deleteOffer.mockReset();
    mocks.isLoadingAction.mockReset();
    mocks.pushToast.mockReset();

    mocks.useToast.mockReturnValue({
      messages: [],
      push: mocks.pushToast,
      remove: vi.fn(),
      clear: vi.fn(),
    });

    mocks.useOfferActions.mockReturnValue({
      updateOffer: mocks.updateOffer,
      deleteOffer: mocks.deleteOffer,
      isLoading: (id: string) => mocks.isLoadingAction(id),
    });

    mocks.useMyOffers.mockReturnValue({
      offers: [],
      isLoading: false,
      isRefreshing: false,
      error: undefined,
      refetch: mocks.refetch,
    });

    mocks.isLoadingAction.mockReturnValue(false);
  });

  it('renders auth ErrorBanner when API returns 401', () => {
    const error: ApiErrorViewModel = {
      error: { code: 'UNAUTHORIZED', message: 'Brak autoryzacji' },
      status: 401,
    };

    mocks.useMyOffers.mockReturnValue({
      offers: [],
      isLoading: false,
      isRefreshing: false,
      error,
      refetch: mocks.refetch,
    });

    render(<MyOffersPage />);

    expect(screen.getByTestId('ErrorBanner')).toHaveTextContent('Brak autoryzacji');
    expect(mocks.ErrorBanner.mock.calls[0][0].isAuthError).toBe(true);
  });

  it('renders LoadingSkeletonGrid when loading (and not refreshing)', () => {
    mocks.useMyOffers.mockReturnValue({
      offers: [],
      isLoading: true,
      isRefreshing: false,
      error: undefined,
      refetch: mocks.refetch,
    });

    render(<MyOffersPage />);

    expect(screen.getByTestId('LoadingSkeletonGrid')).toBeInTheDocument();
  });

  it('switches status filter to REMOVED when clicking "Usunięte"', async () => {
    const user = userEvent.setup();

    render(<MyOffersPage />);

    await user.click(screen.getByRole('button', { name: 'Usunięte' }));

    expect(mocks.useMyOffers).toHaveBeenCalled();
    const lastCallArg = mocks.useMyOffers.mock.calls.at(-1)?.[0];
    expect(lastCallArg).toBe('REMOVED');
  });

  it('allows editing an offer and shows success toast on update success', async () => {
    const user = userEvent.setup();

    mocks.updateOffer.mockResolvedValue({ success: true });

    mocks.useMyOffers.mockReturnValue({
      offers: [offer],
      isLoading: false,
      isRefreshing: false,
      error: undefined,
      refetch: mocks.refetch,
    });

    render(<MyOffersPage />);

    await user.click(screen.getByRole('button', { name: 'Edytuj' }));
    expect(screen.getByTestId('OfferEditForm')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'save' }));

    await waitFor(() => {
      expect(mocks.updateOffer).toHaveBeenCalledWith('o1', { title: 'Nowy tytuł' });
    });

    await waitFor(() => {
      expect(mocks.pushToast).toHaveBeenCalledWith({
        type: 'success',
        text: 'Oferta została zaktualizowana pomyślnie',
      });
    });

    expect(mocks.refetch).toHaveBeenCalled();
  });
});
