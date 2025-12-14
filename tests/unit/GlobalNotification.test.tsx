import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GlobalNotification } from '@/components/GlobalNotification';
import type { LoginNotificationMessage, NotificationMessage } from '@/types';

describe('GlobalNotification', () => {
  it('renders nothing when no message/notification provided', () => {
    const { container } = render(<GlobalNotification />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders success message with role=status', () => {
    const message: NotificationMessage = { type: 'success', text: 'OK' };
    render(<GlobalNotification message={message} />);

    expect(screen.getByRole('status')).toHaveTextContent('OK');
  });

  it('renders error message', () => {
    const message: NotificationMessage = { type: 'error', text: 'Błąd' };
    render(<GlobalNotification notification={message} />);

    expect(screen.getByRole('status')).toHaveTextContent('Błąd');
  });

  it('supports CTA link when actionHref provided', () => {
    const message: LoginNotificationMessage = {
      type: 'error',
      text: 'Ups',
      actionLabel: 'Przejdź',
      actionHref: '/login',
    };

    render(<GlobalNotification message={message} />);

    expect(screen.getByRole('link', { name: 'Przejdź' })).toHaveAttribute('href', '/login');
  });

  it('supports CTA button when actionOnClick provided', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    const message: LoginNotificationMessage = {
      type: 'success',
      text: 'Zrobione',
      actionLabel: 'Cofnij',
      actionOnClick: onClick,
    };

    render(<GlobalNotification message={message} />);

    await user.click(screen.getByRole('button', { name: 'Cofnij' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<GlobalNotification message={{ type: 'success', text: 'OK' }} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Zamknij powiadomienie' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
