import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OffersPageShell } from '@/components/OffersPageShell';
import { AuthProvider } from '@/contexts/AuthContext';

function renderWithAuth(ui: React.ReactElement) {
  return render(<AuthProvider>{ui}</AuthProvider>);
}

const mocks = vi.hoisted(() => ({
  useOfferDetail: vi.fn(),
  useInterestToggle: vi.fn(),
  useUrlPagination: vi.fn(),
  hardNavigate: vi.fn(),

  refresh: vi.fn(),
  setPage: vi.fn(),
  expressInterest: vi.fn(),
  cancelInterest: vi.fn(),
  resetActionState: vi.fn(),

  OffersListPanel: vi.fn(),
  OfferDetailPanel: vi.fn(),
  GlobalNotification: vi.fn(),
}));

vi.mock('@/hooks/useOfferDetail', () => ({
  useOfferDetail: mocks.useOfferDetail,
}));

vi.mock('@/hooks/useInterestToggle', () => ({
  useInterestToggle: mocks.useInterestToggle,
}));

vi.mock('@/hooks/useUrlPagination', () => ({
  useUrlPagination: mocks.useUrlPagination,
}));

vi.mock('@/utils/navigation', () => ({
  hardNavigate: mocks.hardNavigate,
}));

vi.mock('@/components/OffersListPanel', () => ({
  OffersListPanel: (props: {
    selectedOfferId: string;
    onSelect: (offerId: string) => void;
    filter: { sort: string; order: string };
    page: number;
    onPageChange: (page: number) => void;
  }) => {
    mocks.OffersListPanel(props);

    return (
      <div>
        <div data-testid="OffersListPanel">{props.selectedOfferId}</div>
        <button type="button" onClick={() => props.onSelect('o2')}>
          select-o2
        </button>
        <button type="button" onClick={() => props.onPageChange(3)}>
          set-page-3
        </button>
      </div>
    );
  },
}));

vi.mock('@/components/OfferDetailPanel', () => ({
  OfferDetailPanel: (props: {
    offer: unknown;
    isLoading: boolean;
    error?: unknown;
    onRetry: () => void;
    onExpressInterest: (offerId: string) => void;
    onCancelInterest: (interestId: string) => void;
    isMutating: boolean;
  }) => {
    mocks.OfferDetailPanel(props);

    return (
      <div>
        <div data-testid="OfferDetailPanel">{props.offer ? 'has-offer' : 'no-offer'}</div>
        <div data-testid="isLoading">{String(props.isLoading)}</div>
        <div data-testid="isMutating">{String(props.isMutating)}</div>
        <button type="button" onClick={() => props.onRetry()}>
          retry
        </button>
        <button type="button" onClick={() => props.onExpressInterest('o1')}>
          express
        </button>
        <button type="button" onClick={() => props.onCancelInterest('i1')}>
          cancel
        </button>
      </div>
    );
  },
}));

vi.mock('@/components/GlobalNotification', () => ({
  GlobalNotification: (props: { notification?: { type: string; text: string }; onClose?: () => void }) => {
    mocks.GlobalNotification(props);

    return (
      <div>
        <div data-testid="GlobalNotification">{props.notification?.text}</div>
        {props.onClose ? (
          <button type="button" onClick={props.onClose}>
            close
          </button>
        ) : null}
      </div>
    );
  },
}));

describe('OffersPageShell', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    mocks.refresh.mockReset();
    mocks.setPage.mockReset();
    mocks.expressInterest.mockReset();
    mocks.cancelInterest.mockReset();
    mocks.resetActionState.mockReset();
    mocks.hardNavigate.mockReset();

    mocks.useOfferDetail.mockReturnValue({
      offer: { id: 'o1' },
      isLoading: false,
      error: undefined,
      refresh: mocks.refresh,
    });

    mocks.useUrlPagination.mockReturnValue({
      page: 1,
      setPage: mocks.setPage,
    });

    mocks.useInterestToggle.mockReturnValue({
      actionState: { mutating: false, error: undefined },
      expressInterest: mocks.expressInterest,
      cancelInterest: mocks.cancelInterest,
      resetActionState: mocks.resetActionState,
    });
  });

  it('renders list + detail panels and wires base props', () => {
    renderWithAuth(<OffersPageShell offerId="o1" />);

    expect(screen.getByTestId('OffersListPanel')).toHaveTextContent('o1');
    expect(screen.getByTestId('OfferDetailPanel')).toHaveTextContent('has-offer');

    expect(mocks.OffersListPanel).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedOfferId: 'o1',
        page: 1,
        filter: { sort: 'created_at', order: 'desc' },
      }),
    );

    expect(mocks.OfferDetailPanel).toHaveBeenCalledWith(
      expect.objectContaining({
        offer: expect.objectContaining({ id: 'o1' }),
        isLoading: false,
        error: undefined,
        onRetry: mocks.refresh,
        isMutating: false,
      }),
    );
  });

  it('uses hardNavigate when selecting an offer', async () => {
    const user = userEvent.setup();

    renderWithAuth(<OffersPageShell offerId="o1" />);

    await user.click(screen.getByRole('button', { name: 'select-o2' }));

    expect(mocks.hardNavigate).toHaveBeenCalledWith('/offers/o2');
  });

  it('passes onPageChange to useUrlPagination.setPage', async () => {
    const user = userEvent.setup();

    renderWithAuth(<OffersPageShell offerId="o1" />);

    await user.click(screen.getByRole('button', { name: 'set-page-3' }));

    expect(mocks.setPage).toHaveBeenCalledWith(3);
  });

  it('shows success notification after expressing interest (and allows closing)', async () => {
    const user = userEvent.setup();

    mocks.expressInterest.mockResolvedValueOnce({ message: 'OK' });

    renderWithAuth(<OffersPageShell offerId="o1" />);

    await user.click(screen.getByRole('button', { name: 'express' }));

    expect(await screen.findByTestId('GlobalNotification')).toHaveTextContent('OK');
    expect(mocks.refresh).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'close' }));

    expect(mocks.resetActionState).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('GlobalNotification')).not.toBeInTheDocument();
  });

  it('auto-hides notification after 5 seconds', async () => {
    vi.useFakeTimers();
    mocks.expressInterest.mockResolvedValueOnce({ message: 'OK' });

    renderWithAuth(<OffersPageShell offerId="o1" />);

    const lastProps = mocks.OfferDetailPanel.mock.calls.at(-1)?.[0];
    expect(lastProps).toEqual(expect.objectContaining({ onExpressInterest: expect.any(Function) }));

    await act(async () => {
      await lastProps.onExpressInterest('o1');
    });

    expect(screen.getByTestId('GlobalNotification')).toHaveTextContent('OK');

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.queryByTestId('GlobalNotification')).not.toBeInTheDocument();
  });

  it('shows mutual-match message when expressInterest returns chat_id', async () => {
    const user = userEvent.setup();

    mocks.expressInterest.mockResolvedValueOnce({ message: 'Match!', chat_id: 'c1' });

    renderWithAuth(<OffersPageShell offerId="o1" />);

    await user.click(screen.getByRole('button', { name: 'express' }));

    expect(await screen.findByTestId('GlobalNotification')).toHaveTextContent('Match!');
  });

  it('shows error notification when expressing interest fails and hook provides actionState.error', async () => {
    const user = userEvent.setup();

    mocks.useInterestToggle.mockReturnValue({
      actionState: { mutating: false, error: 'Błąd akcji' },
      expressInterest: mocks.expressInterest,
      cancelInterest: mocks.cancelInterest,
      resetActionState: mocks.resetActionState,
    });

    mocks.expressInterest.mockResolvedValueOnce(null);

    renderWithAuth(<OffersPageShell offerId="o1" />);

    await user.click(screen.getByRole('button', { name: 'express' }));

    expect(await screen.findByTestId('GlobalNotification')).toHaveTextContent('Błąd akcji');
  });

  it('shows success notification after cancelling interest', async () => {
    const user = userEvent.setup();

    mocks.cancelInterest.mockResolvedValueOnce(true);

    renderWithAuth(<OffersPageShell offerId="o1" />);

    await user.click(screen.getByRole('button', { name: 'cancel' }));

    expect(await screen.findByTestId('GlobalNotification')).toHaveTextContent('Zainteresowanie zostało anulowane');
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });
});
