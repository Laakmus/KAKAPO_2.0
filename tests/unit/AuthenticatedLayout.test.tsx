import { render, screen } from '@testing-library/react';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';

type ProviderProps = {
  children: React.ReactNode;
  initialToken?: string;
};

type TopNavBarProps = {
  navItems: { label: string; href: string; testId?: string; exact?: boolean; showDot?: boolean }[];
  activePath: string;
  onLogout: () => Promise<void>;
  userLabel?: string;
  isLoggingOut?: boolean;
};

type MainContentContainerProps = {
  isLoading?: boolean;
  children: React.ReactNode;
};

const mocks = vi.hoisted(() => ({
  AuthProvider: vi.fn(),
  useAuth: vi.fn(),
  ToastProvider: vi.fn(),

  useAuthState: vi.fn(),
  useProtectedRoute: vi.fn(),
  useLogout: vi.fn(),

  TopNavBar: vi.fn(),
  MainContentContainer: vi.fn(),
  GlobalToastArea: vi.fn(),
  SkipToContent: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: (props: ProviderProps) => {
    mocks.AuthProvider(props);
    return <>{props.children}</>;
  },
  useAuth: mocks.useAuth,
}));

vi.mock('@/contexts/ToastContext', () => ({
  ToastProvider: (props: { children: React.ReactNode }) => {
    mocks.ToastProvider(props);
    return <>{props.children}</>;
  },
}));

vi.mock('@/hooks/useAuthState', () => ({
  useAuthState: mocks.useAuthState,
}));

vi.mock('@/hooks/useProtectedRoute', () => ({
  useProtectedRoute: mocks.useProtectedRoute,
}));

vi.mock('@/hooks/useLogout', () => ({
  useLogout: mocks.useLogout,
}));

vi.mock('@/components/TopNavBar', () => ({
  TopNavBar: (props: TopNavBarProps) => {
    mocks.TopNavBar(props);
    return <div data-testid="TopNavBar" />;
  },
}));

vi.mock('@/components/MainContentContainer', () => ({
  MainContentContainer: (props: MainContentContainerProps) => {
    mocks.MainContentContainer(props);
    return <div data-testid="MainContentContainer">{props.children}</div>;
  },
}));

vi.mock('@/components/GlobalToastArea', () => ({
  GlobalToastArea: () => {
    mocks.GlobalToastArea();
    return <div data-testid="GlobalToastArea" />;
  },
}));

vi.mock('@/components/SkipToContent', () => ({
  SkipToContent: () => {
    mocks.SkipToContent();
    return <div data-testid="SkipToContent" />;
  },
}));

describe('AuthenticatedLayout', () => {
  beforeEach(() => {
    mocks.AuthProvider.mockReset();
    mocks.useAuth.mockReset();
    mocks.ToastProvider.mockReset();
    mocks.useAuthState.mockReset();
    mocks.useProtectedRoute.mockReset();
    mocks.useLogout.mockReset();
    mocks.TopNavBar.mockReset();
    mocks.MainContentContainer.mockReset();
    mocks.GlobalToastArea.mockReset();
    mocks.SkipToContent.mockReset();

    mocks.useAuth.mockReturnValue({
      user: undefined,
      token: undefined, // disable indicator fetch in tests
      status: 'unauthenticated',
      isLoading: false,
      setUser: vi.fn(),
      setToken: vi.fn(),
      resetSession: vi.fn(),
    });

    mocks.useAuthState.mockReturnValue({
      isLoading: false,
      user: { first_name: 'Jan', last_name: 'Kowalski' },
    });

    mocks.useProtectedRoute.mockReturnValue({
      status: 'ok',
      isReady: true,
    });

    mocks.useLogout.mockReturnValue({
      logout: vi.fn().mockResolvedValue(undefined),
      isLoggingOut: false,
    });
  });

  it('wraps children with providers and passes initialToken to AuthProvider', () => {
    render(
      <AuthenticatedLayout currentPath="/offers" initialToken="t">
        <div data-testid="child" />
      </AuthenticatedLayout>,
    );

    expect(mocks.AuthProvider).toHaveBeenCalledTimes(1);
    expect(mocks.ToastProvider).toHaveBeenCalledTimes(1);

    const providerProps = mocks.AuthProvider.mock.calls[0]?.[0];
    expect(providerProps.initialToken).toBe('t');

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('returns null when protectedRoute.status is redirect', () => {
    mocks.useProtectedRoute.mockReturnValue({ status: 'redirect', isReady: false });

    const { container } = render(
      <AuthenticatedLayout currentPath="/offers">
        <div data-testid="child" />
      </AuthenticatedLayout>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('when route is not ready, renders TopNavBar with undefined userLabel and shows loading container', () => {
    mocks.useProtectedRoute.mockReturnValue({ status: 'ok', isReady: false });

    render(
      <AuthenticatedLayout currentPath="/offers">
        <div data-testid="child" />
      </AuthenticatedLayout>,
    );

    const topNavProps = mocks.TopNavBar.mock.calls.at(-1)?.[0];
    expect(topNavProps).toEqual(
      expect.objectContaining({
        activePath: '/offers',
        userLabel: undefined,
        isLoggingOut: false,
      }),
    );

    const mainProps = mocks.MainContentContainer.mock.calls.at(-1)?.[0];
    expect(mainProps).toEqual(expect.objectContaining({ isLoading: true }));

    // children are replaced by <div /> in this branch
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
  });

  it('when ready, passes computed userLabel and auth.isLoading to MainContentContainer', () => {
    mocks.useAuthState.mockReturnValue({
      isLoading: true,
      user: { first_name: 'Ala', last_name: 'Nowak' },
    });

    render(
      <AuthenticatedLayout currentPath="/profile">
        <div data-testid="child" />
      </AuthenticatedLayout>,
    );

    const topNavProps = mocks.TopNavBar.mock.calls.at(-1)?.[0];
    expect(topNavProps).toEqual(
      expect.objectContaining({
        activePath: '/profile',
        userLabel: 'Ala Nowak',
      }),
    );

    const mainProps = mocks.MainContentContainer.mock.calls.at(-1)?.[0];
    expect(mainProps).toEqual(expect.objectContaining({ isLoading: true }));

    expect(screen.getByTestId('SkipToContent')).toBeInTheDocument();
    expect(screen.getByTestId('GlobalToastArea')).toBeInTheDocument();
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});
