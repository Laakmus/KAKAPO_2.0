import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeleteAccountDialog } from '@/components/DeleteAccountDialog';

const mocks = vi.hoisted(() => ({
  onCancel: vi.fn(),
  onConfirm: vi.fn<[payload: { password: string }], Promise<void>>(),
}));

describe('DeleteAccountDialog', () => {
  beforeEach(() => {
    mocks.onCancel.mockReset();
    mocks.onConfirm.mockReset();
  });

  it('submits password and calls onConfirm with DeleteAccountCommand', async () => {
    const user = userEvent.setup();

    render(
      <DeleteAccountDialog
        isOpen={true}
        onCancel={mocks.onCancel}
        onConfirm={mocks.onConfirm}
        isDeleting={false}
        error={undefined}
      />,
    );

    await user.type(screen.getByLabelText('Hasło'), 'password');
    await user.click(screen.getByRole('button', { name: 'Usuń konto' }));

    expect(mocks.onConfirm).toHaveBeenCalledWith({ password: 'password' });
  });

  it('shows api error when provided', () => {
    render(
      <DeleteAccountDialog
        isOpen={true}
        onCancel={mocks.onCancel}
        onConfirm={mocks.onConfirm}
        isDeleting={false}
        error="Nieprawidłowe hasło"
      />,
    );

    expect(screen.getByText('Nieprawidłowe hasło')).toBeInTheDocument();
  });

  it('calls onCancel and resets form when cancelling', async () => {
    const user = userEvent.setup();

    render(
      <DeleteAccountDialog
        isOpen={true}
        onCancel={mocks.onCancel}
        onConfirm={mocks.onConfirm}
        isDeleting={false}
        error={undefined}
      />,
    );

    const input = screen.getByLabelText('Hasło') as HTMLInputElement;

    await user.type(input, 'password');
    expect(input.value).toBe('password');

    await user.click(screen.getByRole('button', { name: 'Anuluj' }));

    expect(mocks.onCancel).toHaveBeenCalledTimes(1);
    expect(input.value).toBe('');
  });
});
