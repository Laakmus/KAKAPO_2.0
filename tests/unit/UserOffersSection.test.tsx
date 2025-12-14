import { render, screen } from '@testing-library/react';
import { UserOffersSection } from '@/components/UserOffersSection';

describe('UserOffersSection', () => {
  it('shows loading state when isLoading', () => {
    render(<UserOffersSection offers={[]} isLoading={true} onRefresh={vi.fn()} />);

    expect(screen.getByRole('status', { name: 'Ładowanie ofert użytkownika' })).toBeInTheDocument();
  });

  it('shows empty state when there are no offers', () => {
    render(<UserOffersSection offers={[]} isLoading={false} onRefresh={vi.fn()} />);

    expect(screen.getByText('Brak aktywnych ofert')).toBeInTheDocument();
  });

  it('renders offers list with links to offer details', () => {
    render(
      <UserOffersSection
        offers={
          [
            {
              id: 'o1',
              title: 'Rower',
              description: 'Opis',
              city: 'Warszawa',
              created_at: '2025-01-01T10:00:00.000Z',
              image_url: null,
            },
          ] as any
        }
        isLoading={false}
        onRefresh={vi.fn()}
      />,
    );

    expect(screen.getByRole('list')).toBeInTheDocument();

    const item = screen.getByRole('listitem', { name: 'Zobacz szczegóły oferty: Rower w Warszawa' });
    expect(item).toHaveAttribute('href', '/offers/o1');
  });
});
