import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InterestListPanel } from '@/components/InterestListPanel';

const mocks = vi.hoisted(() => ({
  useInterestsList: vi.fn(),
  onClose: vi.fn(),
}));

vi.mock('@/hooks/useInterestsList', () => ({
  useInterestsList: mocks.useInterestsList,
}));

describe('InterestListPanel', () => {
  beforeEach(() => {
    mocks.useInterestsList.mockReset();
    mocks.onClose.mockReset();
  });

  it('calls useInterestsList with offerId + pagination state and can go next/close(reset)', async () => {
    const user = userEvent.setup();

    mocks.useInterestsList.mockImplementation((offerId: string | null, page: number) => {
      return {
        interests: [
          {
            id: 'i1',
            user_id: 'u1',
            user_name: 'Jan',
            status: 'PROPOSED',
            created_at: '2025-01-01T10:00:00.000Z',
          },
        ],
        pagination: { page, total_pages: 3, total: 55 },
        isLoading: false,
        error: null,
      };
    });

    render(<InterestListPanel offerId="o1" isOpen={true} onClose={mocks.onClose} />);

    expect(mocks.useInterestsList).toHaveBeenCalledWith('o1', 1, 20);
    expect(screen.getByText('Jan')).toBeInTheDocument();
    expect(screen.getByText('Zaproponowane')).toBeInTheDocument();
    expect(screen.getByText(/Strona 1 z 3/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Następna' }));

    await waitFor(() => {
      expect(mocks.useInterestsList).toHaveBeenCalledWith('o1', 2, 20);
    });

    await user.click(screen.getByRole('button', { name: 'Zamknij' }));

    expect(mocks.onClose).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(mocks.useInterestsList).toHaveBeenCalledWith('o1', 1, 20);
    });
  });

  it('renders error state (403) with helpful message and close action', async () => {
    const user = userEvent.setup();

    mocks.useInterestsList.mockReturnValue({
      interests: [],
      pagination: null,
      isLoading: false,
      error: { status: 403, error: { message: 'Brak dostępu' } },
    });

    render(<InterestListPanel offerId="o1" isOpen={true} onClose={mocks.onClose} />);

    expect(screen.getByText('Brak dostępu')).toBeInTheDocument();
    expect(screen.getByText('Nie masz uprawnień do przeglądania zainteresowań tej oferty.')).toBeInTheDocument();

    const closeButtons = screen.getAllByRole('button', { name: 'Zamknij' });
    await user.click(closeButtons[0]);
    expect(mocks.onClose).toHaveBeenCalledTimes(1);
  });

  it('renders empty state when there are no interests', () => {
    mocks.useInterestsList.mockReturnValue({
      interests: [],
      pagination: { page: 1, total_pages: 1, total: 0 },
      isLoading: false,
      error: null,
    });

    render(<InterestListPanel offerId="o1" isOpen={true} onClose={mocks.onClose} />);

    expect(screen.getByText('Brak zainteresowanych')).toBeInTheDocument();
  });
});
