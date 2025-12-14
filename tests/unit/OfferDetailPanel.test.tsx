import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OfferDetailPanel } from '@/components/OfferDetailPanel';

describe('OfferDetailPanel', () => {
  it('renders loading skeleton when isLoading', () => {
    const { container } = render(
      <OfferDetailPanel
        offer={null}
        isLoading={true}
        error={undefined}
        onRetry={vi.fn()}
        onExpressInterest={vi.fn()}
        onCancelInterest={vi.fn()}
        isMutating={false}
      />,
    );

    const imageSkeleton = container.querySelector('.aspect-video.bg-gray-200');
    expect(imageSkeleton).toBeInTheDocument();
  });

  it('renders auth error banner with login link for 403', () => {
    render(
      <OfferDetailPanel
        offer={null}
        isLoading={false}
        error={{ status: 403, error: { message: 'Brak dostępu' } } as any}
        onRetry={vi.fn()}
        onExpressInterest={vi.fn()}
        onCancelInterest={vi.fn()}
        isMutating={false}
      />,
    );

    expect(screen.getByText('Wymagana jest autoryzacja')).toBeInTheDocument();
    expect(screen.getByText('Brak dostępu')).toBeInTheDocument();

    const loginLink = screen.getByRole('link', { name: 'Zaloguj się' });
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('renders empty state when offer is missing', () => {
    render(
      <OfferDetailPanel
        offer={null}
        isLoading={false}
        error={undefined}
        onRetry={vi.fn()}
        onExpressInterest={vi.fn()}
        onCancelInterest={vi.fn()}
        isMutating={false}
      />,
    );

    expect(screen.getByText('Oferta nie istnieje')).toBeInTheDocument();
    const links = screen.getAllByRole('link', { name: 'Wróć do listy ofert' });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).toHaveAttribute('href', '/offers');
    }
  });

  it('wires InterestToggleCTA with callbacks and renders back-to-list link', async () => {
    const user = userEvent.setup();
    const onExpressInterest = vi.fn();

    render(
      <OfferDetailPanel
        offer={
          {
            id: 'o1',
            title: 'Rower',
            description: 'Opis',
            city: 'Warszawa',
            formattedDate: '1 sty 2025',
            status: 'ACTIVE',
            statusLabel: 'Aktywna',
            is_interested: false,
            is_owner: false,
            current_user_interest_id: undefined,
            interests_count: 2,
            owner_id: 'u1',
            owner_name: 'Jan',
            image_url: null,
            images: [],
          } as any
        }
        isLoading={false}
        error={undefined}
        onRetry={vi.fn()}
        onExpressInterest={onExpressInterest}
        onCancelInterest={vi.fn()}
        isMutating={false}
      />,
    );

    expect(screen.getByRole('link', { name: 'Wróć do listy ofert' })).toHaveAttribute('href', '/offers');

    await user.click(screen.getByRole('button', { name: 'Jestem zainteresowany' }));
    expect(onExpressInterest).toHaveBeenCalledWith('o1');
  });
});
