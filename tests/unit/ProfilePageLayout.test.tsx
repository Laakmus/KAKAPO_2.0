import { render, screen } from '@testing-library/react';
import { ProfilePageLayout } from '@/components/ProfilePageLayout';

const mocks = vi.hoisted(() => ({
  AuthenticatedLayout: vi.fn(),
  ProfilePage: vi.fn(),
}));

vi.mock('@/components/AuthenticatedLayout', () => ({
  AuthenticatedLayout: (props: { currentPath: string; initialToken?: string; children: React.ReactNode }) => {
    mocks.AuthenticatedLayout(props);
    return <div data-testid="AuthenticatedLayout">{props.children}</div>;
  },
}));

vi.mock('@/components/ProfilePage', () => ({
  ProfilePage: () => {
    mocks.ProfilePage();
    return <div data-testid="ProfilePage" />;
  },
}));

describe('ProfilePageLayout', () => {
  it('wraps ProfilePage with AuthenticatedLayout and forwards props', () => {
    render(<ProfilePageLayout currentPath="/profile" initialToken="t1" />);

    expect(screen.getByTestId('AuthenticatedLayout')).toBeInTheDocument();
    expect(screen.getByTestId('ProfilePage')).toBeInTheDocument();

    expect(mocks.AuthenticatedLayout).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPath: '/profile',
        initialToken: 't1',
      }),
    );
  });
});
