import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatStatusControls, RealizeButton } from '@/components/ChatStatusControls';
import type { InterestRealizationState } from '@/types';

describe('ChatStatusControls', () => {
  it('returns null when no state is provided', () => {
    const state = undefined as unknown as InterestRealizationState;

    const { container } = render(
      <ChatStatusControls state={state} onRealize={vi.fn()} onUnrealize={vi.fn()} isProcessing={false} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders status info even when no actions are available', () => {
    const state: InterestRealizationState = {
      can_realize: false,
      can_unrealize: false,
      other_confirmed: false,
      status: 'PROPOSED',
    };

    render(<ChatStatusControls state={state} onRealize={vi.fn()} onUnrealize={vi.fn()} isProcessing={false} />);

    expect(screen.getByText('Status wymiany:')).toBeInTheDocument();
    expect(screen.getByText('Proponowana')).toBeInTheDocument();
  });

  it('renders realize button when can_realize is true and calls onRealize after dialog confirmation', async () => {
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

    // Click realize button to open dialog
    await user.click(screen.getByRole('button', { name: /potwierdzam realizację/i }));

    // Dialog should be visible
    expect(screen.getByText('Potwierdzenie realizacji wymiany')).toBeInTheDocument();

    // Click confirm button in dialog
    await user.click(screen.getByRole('button', { name: /^potwierdzam$/i }));
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

  it('hides realize button when hideRealizeButton is true', () => {
    const state: InterestRealizationState = {
      can_realize: true,
      can_unrealize: false,
      other_confirmed: false,
      status: 'ACCEPTED',
      message: 'Status message',
    };

    render(
      <ChatStatusControls
        state={state}
        onRealize={vi.fn()}
        onUnrealize={vi.fn()}
        isProcessing={false}
        hideRealizeButton
      />,
    );

    // Status message should still be visible
    expect(screen.getByText('Status message')).toBeInTheDocument();
    // Realize button should NOT be visible
    expect(screen.queryByRole('button', { name: /potwierdzam realizację/i })).not.toBeInTheDocument();
  });

  it('still shows unrealize button when hideRealizeButton is true and can_unrealize', () => {
    const state: InterestRealizationState = {
      can_realize: false,
      can_unrealize: true,
      other_confirmed: false,
      status: 'REALIZED',
    };

    render(
      <ChatStatusControls
        state={state}
        onRealize={vi.fn()}
        onUnrealize={vi.fn()}
        isProcessing={false}
        hideRealizeButton
      />,
    );

    expect(screen.getByRole('button', { name: /anuluj potwierdzenie/i })).toBeInTheDocument();
  });
});

describe('RealizeButton', () => {
  it('renders button with correct label', () => {
    render(<RealizeButton onRealize={vi.fn()} isProcessing={false} />);

    expect(screen.getByRole('button', { name: /potwierdzam realizację/i })).toBeInTheDocument();
  });

  it('opens confirmation dialog when clicked and calls onRealize after confirmation', async () => {
    const user = userEvent.setup();
    const onRealize = vi.fn().mockResolvedValue(undefined);

    render(<RealizeButton onRealize={onRealize} isProcessing={false} />);

    // Click button to open dialog
    await user.click(screen.getByRole('button', { name: /potwierdzam realizację/i }));

    // Dialog should be visible with proper content
    expect(screen.getByText('Potwierdzenie realizacji wymiany')).toBeInTheDocument();
    expect(screen.getByText(/czy na pewno chcesz potwierdzić realizację/i)).toBeInTheDocument();
    expect(screen.getByText(/status zmieni się na/i)).toBeInTheDocument();

    // Click confirm button
    await user.click(screen.getByRole('button', { name: /^potwierdzam$/i }));
    expect(onRealize).toHaveBeenCalledTimes(1);
  });

  it('does not call onRealize when dialog is cancelled', async () => {
    const user = userEvent.setup();
    const onRealize = vi.fn().mockResolvedValue(undefined);

    render(<RealizeButton onRealize={onRealize} isProcessing={false} />);

    // Click button to open dialog
    await user.click(screen.getByRole('button', { name: /potwierdzam realizację/i }));

    // Click cancel button
    await user.click(screen.getByRole('button', { name: /anuluj/i }));
    expect(onRealize).not.toHaveBeenCalled();
  });

  it('shows processing state and disables button when isProcessing is true', () => {
    render(<RealizeButton onRealize={vi.fn()} isProcessing={true} />);

    const button = screen.getByRole('button', { name: /przetwarzanie/i });
    expect(button).toBeDisabled();
  });

  it('respects disabled prop', () => {
    render(<RealizeButton onRealize={vi.fn()} isProcessing={false} disabled />);

    const button = screen.getByRole('button', { name: /potwierdzam realizację/i });
    expect(button).toBeDisabled();
  });
});
