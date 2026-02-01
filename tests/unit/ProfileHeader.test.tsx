import { render, screen } from '@testing-library/react';
import { ProfileHeader } from '@/components/ProfileHeader';

describe('ProfileHeader', () => {
  it('renders full name and initials when there is no avatarUrl', () => {
    render(<ProfileHeader firstName="Jan" lastName="Kowalski" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Jan Kowalski' })).toBeInTheDocument();
    expect(screen.getByText('JK')).toBeInTheDocument();
  });

  it('renders avatar image when avatarUrl is provided', () => {
    render(<ProfileHeader firstName="Jan" lastName="Kowalski" avatarUrl="https://example.com/a.jpg" />);

    const img = screen.getByRole('img', { name: 'Jan Kowalski' });
    expect(img).toHaveAttribute('src', 'https://example.com/a.jpg');

    expect(screen.queryByText('JK')).not.toBeInTheDocument();
  });
});
