import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GlobalToastArea } from '@/components/GlobalToastArea';

const mocks = vi.hoisted(() => ({
  useToast: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@/contexts/ToastContext', () => ({
  useToast: mocks.useToast,
}));

describe('GlobalToastArea', () => {
  beforeEach(() => {
    mocks.remove.mockReset();
    mocks.useToast.mockReturnValue({ messages: [], remove: mocks.remove });
  });

  it('renders nothing when there are no toast messages', () => {
    const { container } = render(<GlobalToastArea />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders provided toast messages', () => {
    mocks.useToast.mockReturnValue({
      messages: [
        { id: 't1', type: 'success', text: 'OK' },
        { id: 't2', type: 'error', text: 'Błąd' },
      ],
      remove: mocks.remove,
    });

    render(<GlobalToastArea />);

    expect(screen.getByText('OK')).toBeInTheDocument();
    expect(screen.getByText('Błąd')).toBeInTheDocument();
  });

  it('calls remove(message.id) when close button is clicked', async () => {
    const user = userEvent.setup();

    mocks.useToast.mockReturnValue({
      messages: [{ id: 't1', type: 'success', text: 'OK' }],
      remove: mocks.remove,
    });

    render(<GlobalToastArea />);

    await user.click(screen.getByRole('button', { name: 'Zamknij powiadomienie' }));
    expect(mocks.remove).toHaveBeenCalledWith('t1');
  });

  it('renders CTA and invokes onAction when provided', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();

    mocks.useToast.mockReturnValue({
      messages: [{ id: 't1', type: 'error', text: 'Błąd', actionLabel: 'Ponów', onAction }],
      remove: mocks.remove,
    });

    render(<GlobalToastArea />);

    await user.click(screen.getByRole('button', { name: 'Ponów' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
