import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InterestToggleCTA } from '@/components/InterestToggleCTA';

describe('InterestToggleCTA', () => {
  const baseProps = {
    offerId: 'offer-1',
    isInterested: false,
    isOwner: false,
    currentInterestId: undefined as string | undefined,
    status: 'ACTIVE',
    isMutating: false,
    interestsCount: 3,
    canExpressInterest: true,
    onBlockedExpressInterest: vi.fn(),
    onExpress: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    baseProps.onExpress.mockClear();
    baseProps.onCancel.mockClear();
    baseProps.onBlockedExpressInterest.mockClear();
  });

  it('calls onExpress when user is not interested', async () => {
    const user = userEvent.setup();
    render(<InterestToggleCTA {...baseProps} isInterested={false} />);

    await user.click(screen.getByRole('button', { name: 'Jestem zainteresowany' }));
    expect(baseProps.onExpress).toHaveBeenCalledWith('offer-1');
    expect(baseProps.onCancel).not.toHaveBeenCalled();
    expect(baseProps.onBlockedExpressInterest).not.toHaveBeenCalled();
  });

  it('blocks express interest when user has no active offers and calls onBlockedExpressInterest', async () => {
    const user = userEvent.setup();
    render(<InterestToggleCTA {...baseProps} isInterested={false} canExpressInterest={false} />);

    await user.click(screen.getByRole('button', { name: 'Nie masz oferty do zaoferowania' }));
    expect(baseProps.onBlockedExpressInterest).toHaveBeenCalledTimes(1);
    expect(baseProps.onExpress).not.toHaveBeenCalled();
    expect(baseProps.onCancel).not.toHaveBeenCalled();
    expect(screen.getByText('Nie masz oferty do zaoferowania')).toBeInTheDocument();
  });

  it('calls onCancel when user is interested and has currentInterestId', async () => {
    const user = userEvent.setup();
    render(<InterestToggleCTA {...baseProps} isInterested={true} currentInterestId="interest-1" />);

    await user.click(screen.getByRole('button', { name: 'Anuluj zainteresowanie' }));
    expect(baseProps.onCancel).toHaveBeenCalledWith('interest-1');
    expect(baseProps.onExpress).not.toHaveBeenCalled();
  });

  it('is disabled for owner and shows info text with interestsCount', () => {
    render(<InterestToggleCTA {...baseProps} isOwner={true} />);

    const btn = screen.getByRole('button', { name: 'Nie możesz być zainteresowany własną ofertą' });
    expect(btn).toBeDisabled();
    expect(screen.getByText(/liczba zainteresowanych:/i)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('is disabled for removed offers and shows removed info', () => {
    render(<InterestToggleCTA {...baseProps} status="REMOVED" />);
    expect(screen.getByRole('button', { name: 'Oferta została usunięta' })).toBeDisabled();
    expect(screen.getByText(/oferta została usunięta/i)).toBeInTheDocument();
  });

  it('shows loading state when isMutating is true', () => {
    render(<InterestToggleCTA {...baseProps} isMutating={true} />);

    const btn = screen.getByRole('button', { name: 'Trwa przetwarzanie...' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Przetwarzanie...')).toBeInTheDocument();
  });

  it('disables cancel when isInterested but currentInterestId is missing and shows helper message', () => {
    render(<InterestToggleCTA {...baseProps} isInterested={true} currentInterestId={undefined} />);

    expect(screen.getByRole('button', { name: 'Anuluj zainteresowanie' })).toBeDisabled();
    expect(screen.getByText(/odśwież stronę aby móc anulować/i)).toBeInTheDocument();
  });
});
