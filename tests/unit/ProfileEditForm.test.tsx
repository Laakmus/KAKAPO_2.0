import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileEditForm } from '@/components/ProfileEditForm';

const mocks = vi.hoisted(() => ({
  onSubmit: vi.fn<[payload: { first_name: string; last_name: string }], Promise<void>>(),
  onCancel: vi.fn(),
}));

describe('ProfileEditForm', () => {
  beforeEach(() => {
    mocks.onSubmit.mockReset();
    mocks.onCancel.mockReset();
  });

  it('disables submit until form is dirty and calls onSubmit with edited values', async () => {
    const user = userEvent.setup();

    render(
      <ProfileEditForm
        initialValues={{ first_name: 'Jan', last_name: 'Kowalski' } as any}
        onSubmit={mocks.onSubmit}
        onCancel={mocks.onCancel}
        isSubmitting={false}
      />,
    );

    const saveBtn = screen.getByRole('button', { name: 'Zapisz zmiany' });
    expect(saveBtn).toBeDisabled();

    const firstName = screen.getByLabelText('Imię') as HTMLInputElement;

    await user.clear(firstName);
    await user.type(firstName, 'Ala');

    expect(screen.getByText('Masz niezapisane zmiany')).toBeInTheDocument();
    expect(saveBtn).toBeEnabled();

    await user.click(saveBtn);

    expect(mocks.onSubmit).toHaveBeenCalledWith({ first_name: 'Ala', last_name: 'Kowalski' });
  });

  it('calls onCancel when cancelling', async () => {
    const user = userEvent.setup();

    render(
      <ProfileEditForm
        initialValues={{ first_name: 'Jan', last_name: 'Kowalski' } as any}
        onSubmit={mocks.onSubmit}
        onCancel={mocks.onCancel}
        isSubmitting={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Anuluj' }));

    expect(mocks.onCancel).toHaveBeenCalledTimes(1);
  });
});
