import { render, screen } from '@testing-library/react';
import { OffersNewPageLayout } from '@/components/OffersNewPageLayout';

const mocks = vi.hoisted(() => ({
  AuthenticatedLayout: vi.fn(),
  OffersNewPage: vi.fn(),
}));

vi.mock('@/components/AuthenticatedLayout', () => ({
  AuthenticatedLayout: (props: { currentPath: string; initialToken?: string; children: React.ReactNode }) => {
    mocks.AuthenticatedLayout(props);
    return <div data-testid="AuthenticatedLayout">{props.children}</div>;
  },
}));

vi.mock('@/components/OffersNewPage', () => ({
  OffersNewPage: () => {
    mocks.OffersNewPage();
    return <div data-testid="OffersNewPage" />;
  },
}));

describe('OffersNewPageLayout', () => {
  it('wraps OffersNewPage with AuthenticatedLayout and forwards props', () => {
    render(<OffersNewPageLayout currentPath="/offers/new" initialToken="t1" />);

    expect(screen.getByTestId('AuthenticatedLayout')).toBeInTheDocument();
    expect(screen.getByTestId('OffersNewPage')).toBeInTheDocument();

    expect(mocks.AuthenticatedLayout).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPath: '/offers/new',
        initialToken: 't1',
      }),
    );
  });
});
