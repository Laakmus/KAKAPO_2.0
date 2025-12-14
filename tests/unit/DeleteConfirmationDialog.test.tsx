import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeleteConfirmationDialog } from '@/components/DeleteConfirmationDialog';

const mocks = vi.hoisted(() => ({
  onCancel: vi.fn(),
  onConfirm: vi.fn<[], Promise<void>>(),
}));

describe('DeleteConfirmationDialog', () => {
  beforeEach(() => {
    mocks.onCancel.mockReset();
    mocks.onConfirm.mockReset();
  });

  it('renders dialog content and calls onConfirm on destructive action', async () => {
    const user = userEvent.setup();

    render(
      <DeleteConfirmationDialog
        isOpen={true}
        offerTitle="Rower"
        onCancel={mocks.onCancel}
        onConfirm={mocks.onConfirm}
        isDeleting={false}
      />,
    );

    expect(screen.getByText('Czy na pewno chcesz usunąć tę ofertę?')).toBeInTheDocument();
    expect(screen.getByText('"Rower"')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Usuń ofertę' }));

    expect(mocks.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when clicking cancel', async () => {
    const user = userEvent.setup();

    render(
      <DeleteConfirmationDialog
        isOpen={true}
        offerTitle="Rower"
        onCancel={mocks.onCancel}
        onConfirm={mocks.onConfirm}
        isDeleting={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Anuluj' }));

    expect(mocks.onCancel).toHaveBeenCalledTimes(1);
  });

  it('disables actions and shows loading label when isDeleting', () => {
    render(
      <DeleteConfirmationDialog
        isOpen={true}
        offerTitle="Rower"
        onCancel={mocks.onCancel}
        onConfirm={mocks.onConfirm}
        isDeleting={true}
      />,
    );

    expect(screen.getByRole('button', { name: 'Anuluj' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Usuwanie...' })).toBeDisabled();
  });
});
