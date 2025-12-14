import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileViewMode } from '@/components/ProfileViewMode';

describe('ProfileViewMode', () => {
  it('renders profile fields and wires edit/delete actions', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDeleteRequest = vi.fn();

    render(
      <ProfileViewMode
        profile={{ first_name: 'Jan', last_name: 'Kowalski' } as any}
        onEdit={onEdit}
        onDeleteRequest={onDeleteRequest}
      />,
    );

    expect(screen.getByText('Jan')).toBeInTheDocument();
    expect(screen.getByText('Kowalski')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edytuj profil' }));
    expect(onEdit).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Usuń konto' }));
    expect(onDeleteRequest).toHaveBeenCalledTimes(1);
  });
});
