import { render, screen } from '@testing-library/react';
import { UserProfileHeader } from '@/components/UserProfileHeader';

describe('UserProfileHeader', () => {
  it('renders full name, initials and active offers counter', () => {
    render(<UserProfileHeader firstName="Jan" lastName="Kowalski" activeOffersCount={2} />);

    expect(screen.getByRole('region', { name: 'Profil użytkownika' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Jan Kowalski' })).toBeInTheDocument();

    expect(screen.getByText('JK')).toBeInTheDocument();

    expect(screen.getByRole('status', { name: 'Liczba aktywnych ofert: 2' })).toBeInTheDocument();
    expect(screen.getByText('2 aktywnych ofert')).toBeInTheDocument();
  });
});
