import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatStatusControls } from '@/components/ChatStatusControls';
import type { InterestRealizationState } from '@/types';

describe('ChatStatusControls', () => {
  it('returns null when no actions are available', () => {
    const state: InterestRealizationState = {
      can_realize: false,
      can_unrealize: false,
      other_confirmed: false,
      status: 'PROPOSED',
    };

    const { container } = render(
      <ChatStatusControls state={state} onRealize={vi.fn()} onUnrealize={vi.fn()} isProcessing={false} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders realize button when can_realize is true and calls onRealize', async () => {
    const user = userEvent.setup();

    const onRealize = vi.fn().mockResolvedValue(undefined);
    const state: InterestRealizationState = {
      can_realize: true,
      can_unrealize: false,
      other_confirmed: false,
      status: 'ACCEPTED',
      message: 'Możesz potwierdzić realizację.',
    };

    render(<ChatStatusControls state={state} onRealize={onRealize} onUnrealize={vi.fn()} isProcessing={false} />);

    expect(screen.getByText('Możesz potwierdzić realizację.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /potwierdzam realizację/i }));
    expect(onRealize).toHaveBeenCalledTimes(1);
  });

  it('renders unrealize button when can_unrealize is true and calls onUnrealize', async () => {
    const user = userEvent.setup();

    const onUnrealize = vi.fn().mockResolvedValue(undefined);
    const state: InterestRealizationState = {
      can_realize: false,
      can_unrealize: true,
      other_confirmed: false,
      status: 'REALIZED',
    };

    render(<ChatStatusControls state={state} onRealize={vi.fn()} onUnrealize={onUnrealize} isProcessing={false} />);

    await user.click(screen.getByRole('button', { name: /anuluj potwierdzenie/i }));
    expect(onUnrealize).toHaveBeenCalledTimes(1);
  });

  it('disables action buttons and shows processing label when isProcessing is true', () => {
    const state: InterestRealizationState = {
      can_realize: true,
      can_unrealize: false,
      other_confirmed: false,
      status: 'ACCEPTED',
    };

    render(<ChatStatusControls state={state} onRealize={vi.fn()} onUnrealize={vi.fn()} isProcessing={true} />);

    const button = screen.getByRole('button', { name: /przetwarzanie/i });
    expect(button).toBeDisabled();
  });
});
