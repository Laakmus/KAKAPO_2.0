import { render, screen } from '@testing-library/react';
import { MyOffersPageLayout } from '@/components/MyOffersPageLayout';

const mocks = vi.hoisted(() => ({
  AuthenticatedLayout: vi.fn(),
  MyOffersPage: vi.fn(),
}));

vi.mock('@/components/AuthenticatedLayout', () => ({
  AuthenticatedLayout: (props: { currentPath: string; initialToken?: string; children: React.ReactNode }) => {
    mocks.AuthenticatedLayout(props);
    return <div data-testid="AuthenticatedLayout">{props.children}</div>;
  },
}));

vi.mock('@/components/MyOffersPage', () => ({
  MyOffersPage: () => {
    mocks.MyOffersPage();
    return <div data-testid="MyOffersPage" />;
  },
}));

describe('MyOffersPageLayout', () => {
  it('wraps MyOffersPage with AuthenticatedLayout and forwards props', () => {
    render(<MyOffersPageLayout currentPath="/my-offers" initialToken="t1" />);

    expect(screen.getByTestId('AuthenticatedLayout')).toBeInTheDocument();
    expect(screen.getByTestId('MyOffersPage')).toBeInTheDocument();

    expect(mocks.AuthenticatedLayout).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPath: '/my-offers',
        initialToken: 't1',
      }),
    );
  });
});
