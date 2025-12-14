import { render, screen } from '@testing-library/react';
import { HomeOffersPageLayout } from '@/components/HomeOffersPageLayout';

const mocks = vi.hoisted(() => ({
  AuthenticatedLayout: vi.fn(),
  HomeOffersPage: vi.fn(),
}));

vi.mock('@/components/AuthenticatedLayout', () => ({
  AuthenticatedLayout: (props: { currentPath: string; initialToken?: string; children: React.ReactNode }) => {
    mocks.AuthenticatedLayout(props);
    return <div data-testid="AuthenticatedLayout">{props.children}</div>;
  },
}));

vi.mock('@/components/HomeOffersPage', () => ({
  HomeOffersPage: () => {
    mocks.HomeOffersPage();
    return <div data-testid="HomeOffersPage" />;
  },
}));

describe('HomeOffersPageLayout', () => {
  it('wraps HomeOffersPage with AuthenticatedLayout and forwards props', () => {
    render(<HomeOffersPageLayout currentPath="/" initialToken="t1" />);

    expect(screen.getByTestId('AuthenticatedLayout')).toBeInTheDocument();
    expect(screen.getByTestId('HomeOffersPage')).toBeInTheDocument();

    expect(mocks.AuthenticatedLayout).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPath: '/',
        initialToken: 't1',
      }),
    );
  });
});
