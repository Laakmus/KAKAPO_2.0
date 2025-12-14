import { render, screen } from '@testing-library/react';
import { ProfileStats } from '@/components/ProfileStats';

describe('ProfileStats', () => {
  it('renders email, formatted registration date and link to my offers with proper pluralization', () => {
    render(<ProfileStats email="jan@example.com" createdAt="2025-01-02T10:00:00.000Z" activeOffersCount={1} />);

    expect(screen.getByText('jan@example.com')).toBeInTheDocument();
    expect(screen.getByText(/2025/)).toBeInTheDocument();

    const link = screen.getByRole('link', { name: '1 oferta' });
    expect(link).toHaveAttribute('href', '/offers/my');
  });

  it('uses plural "ofert" for counts other than 1', () => {
    render(<ProfileStats email="jan@example.com" createdAt="2025-01-02T10:00:00.000Z" activeOffersCount={3} />);

    expect(screen.getByRole('link', { name: '3 ofert' })).toBeInTheDocument();
  });
});
