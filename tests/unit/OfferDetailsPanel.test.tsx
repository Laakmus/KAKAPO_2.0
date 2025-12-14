import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OfferDetailsPanel } from '@/components/OfferDetailsPanel';

describe('OfferDetailsPanel', () => {
  it('renders placeholder when there is no selected offer', () => {
    render(<OfferDetailsPanel selectedOffer={undefined} onClose={vi.fn()} />);

    expect(screen.getByText('Wybierz ofertę, aby zobaczyć szczegóły')).toBeInTheDocument();
  });

  it('renders details, owner link for non-own offer, badge for images_count > 1 and closes', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <OfferDetailsPanel
        onClose={onClose}
        selectedOffer={
          {
            id: 'o1',
            title: 'Rower',
            description: 'Opis',
            city: 'Warszawa',
            created_at: '2025-01-01T10:00:00.000Z',
            owner_id: 'u1',
            owner_name: 'Jan',
            image_url: 'https://example.com/img.jpg',
            thumbnail_url: 'https://example.com/thumb.jpg',
            interests_count: 5,
            images_count: 3,
            isOwnOffer: false,
          } as any
        }
      />,
    );

    expect(screen.getByText('Szczegóły oferty')).toBeInTheDocument();
    expect(screen.getByText('Rower')).toBeInTheDocument();

    expect(screen.getByLabelText('3 zdjęć')).toBeInTheDocument();

    const ownerLink = screen.getByRole('link', { name: 'Zobacz profil użytkownika Jan' });
    expect(ownerLink).toHaveAttribute('href', '/users/u1');

    await user.click(screen.getByRole('button', { name: 'Zamknij szczegóły' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders owner as plain text when isOwnOffer is true', () => {
    render(
      <OfferDetailsPanel
        onClose={vi.fn()}
        selectedOffer={
          {
            id: 'o1',
            title: 'Rower',
            description: 'Opis',
            city: 'Warszawa',
            created_at: '2025-01-01T10:00:00.000Z',
            owner_id: 'u1',
            owner_name: 'Jan',
            image_url: null,
            thumbnail_url: null,
            interests_count: 0,
            images_count: 0,
            isOwnOffer: true,
          } as any
        }
      />,
    );

    expect(screen.getByText('Jan')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Zobacz profil użytkownika/ })).not.toBeInTheDocument();
  });
});
