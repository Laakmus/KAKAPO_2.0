import { render, screen } from '@testing-library/react';
import { OfferDetailPageLayout } from '@/components/OfferDetailPageLayout';

const mocks = vi.hoisted(() => ({
  AuthenticatedLayout: vi.fn(),
  OffersPageShell: vi.fn(),
}));

vi.mock('@/components/AuthenticatedLayout', () => ({
  AuthenticatedLayout: (props: { currentPath: string; initialToken?: string; children: React.ReactNode }) => {
    mocks.AuthenticatedLayout(props);
    return <div data-testid="AuthenticatedLayout">{props.children}</div>;
  },
}));

vi.mock('@/components/OffersPageShell', () => ({
  OffersPageShell: (props: { offerId: string }) => {
    mocks.OffersPageShell(props);
    return <div data-testid="OffersPageShell">{props.offerId}</div>;
  },
}));

describe('OfferDetailPageLayout', () => {
  it('wraps OffersPageShell with AuthenticatedLayout and forwards props', () => {
    render(<OfferDetailPageLayout currentPath="/offers/o1" initialToken="t1" offerId="o1" />);

    expect(screen.getByTestId('AuthenticatedLayout')).toBeInTheDocument();
    expect(screen.getByTestId('OffersPageShell')).toHaveTextContent('o1');

    expect(mocks.AuthenticatedLayout).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPath: '/offers/o1',
        initialToken: 't1',
      }),
    );

    expect(mocks.OffersPageShell).toHaveBeenCalledWith(expect.objectContaining({ offerId: 'o1' }));
  });
});
