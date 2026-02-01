import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TopNavBar, type NavItem } from '@/components/TopNavBar';

const mocks = vi.hoisted(() => ({
  onLogout: vi.fn<[], Promise<void>>(),
}));

describe('TopNavBar', () => {
  beforeEach(() => {
    mocks.onLogout.mockReset();
  });

  const baseNavItems: NavItem[] = [
    { label: 'Home', href: '/offers', testId: 'nav-home', exact: false },
    { label: 'Nowa', href: '/offers/new', testId: 'nav-new', exact: true },
  ];

  it('marks active item with aria-current="page" (exact vs startsWith)', () => {
    const { rerender } = render(
      <TopNavBar navItems={baseNavItems} activePath="/offers" onLogout={mocks.onLogout} userLabel="U" />,
    );

    expect(screen.getByTestId('nav-home')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('nav-new')).not.toHaveAttribute('aria-current');

    rerender(<TopNavBar navItems={baseNavItems} activePath="/offers/new" onLogout={mocks.onLogout} userLabel="U" />);

    expect(screen.getByTestId('nav-new')).toHaveAttribute('aria-current', 'page');
  });

  it('shows userLabel when provided and does not render skeleton', () => {
    render(
      <TopNavBar navItems={baseNavItems} activePath="/offers" onLogout={mocks.onLogout} userLabel="Jan Kowalski" />,
    );

    expect(screen.getByText('Jan Kowalski')).toBeInTheDocument();
    expect(screen.queryByLabelText('Ładowanie profilu...')).not.toBeInTheDocument();
  });

  it('renders skeleton when userLabel is missing and isLoggingOut is false', () => {
    render(<TopNavBar navItems={baseNavItems} activePath="/offers" onLogout={mocks.onLogout} userLabel={undefined} />);

    expect(screen.getByLabelText('Ładowanie profilu...')).toBeInTheDocument();
  });

  it('calls onLogout when clicking logout (and blocks when isLoggingOut)', async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <TopNavBar
        navItems={baseNavItems}
        activePath="/offers"
        onLogout={mocks.onLogout}
        userLabel="U"
        isLoggingOut={false}
      />,
    );

    await user.click(screen.getByTestId('logout-button'));
    expect(mocks.onLogout).toHaveBeenCalledTimes(1);

    mocks.onLogout.mockClear();

    rerender(
      <TopNavBar
        navItems={baseNavItems}
        activePath="/offers"
        onLogout={mocks.onLogout}
        userLabel="U"
        isLoggingOut={true}
      />,
    );

    expect(screen.getByTestId('logout-button')).toBeDisabled();
    await user.click(screen.getByTestId('logout-button'));

    expect(mocks.onLogout).not.toHaveBeenCalled();
  });
});
