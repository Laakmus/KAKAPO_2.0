import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserProfileClient } from '@/components/UserProfileClient';

const mocks = vi.hoisted(() => ({
  useUserProfile: vi.fn(),
  refresh: vi.fn(),
  hardNavigate: vi.fn(),
}));

vi.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: mocks.useUserProfile,
}));

vi.mock('@/utils/navigation', () => ({
  hardNavigate: mocks.hardNavigate,
}));

describe('UserProfileClient', () => {
  beforeEach(() => {
    mocks.useUserProfile.mockReset();
    mocks.refresh.mockReset();
    mocks.hardNavigate.mockReset();

    window.history.replaceState({}, '', '/users/u1');
  });

  it('renders loading state when profile is loading and missing', () => {
    mocks.useUserProfile.mockReturnValue({
      profile: null,
      offers: [],
      isLoadingProfile: true,
      isLoadingOffers: false,
      profileError: null,
      offersError: null,
      refresh: mocks.refresh,
    });

    render(<UserProfileClient userId="u1" />);

    expect(screen.getByRole('main', { name: 'Ładowanie profilu użytkownika' })).toBeInTheDocument();
  });

  it('hard-navigates to /login when profileError is 401', async () => {
    mocks.useUserProfile.mockReturnValue({
      profile: null,
      offers: [],
      isLoadingProfile: false,
      isLoadingOffers: false,
      profileError: { statusCode: 401, message: 'Unauthorized' },
      offersError: null,
      refresh: mocks.refresh,
    });

    render(<UserProfileClient userId="u1" />);

    await waitFor(() => {
      expect(mocks.hardNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('renders profile error state (404) and retry uses goBack (fallback to /offers)', async () => {
    const user = userEvent.setup();
    const backSpy = vi.spyOn(window.history, 'back');

    mocks.useUserProfile.mockReturnValue({
      profile: null,
      offers: [],
      isLoadingProfile: false,
      isLoadingOffers: false,
      profileError: { statusCode: 404, message: 'Not found' },
      offersError: null,
      refresh: mocks.refresh,
    });

    render(<UserProfileClient userId="u1" />);

    expect(screen.getByText('Użytkownik nie został znaleziony')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }));

    expect(backSpy).not.toHaveBeenCalled();
    expect(mocks.hardNavigate).toHaveBeenCalledWith('/offers');
  });

  it('goBack uses history.back when available', async () => {
    const user = userEvent.setup();
    const backSpy = vi.spyOn(window.history, 'back');

    // add extra history entry so length > 1
    window.history.pushState({}, '', '/users/u1?x=1');

    mocks.useUserProfile.mockReturnValue({
      profile: { first_name: 'Jan', last_name: 'Kowalski', active_offers_count: 2 },
      offers: [],
      isLoadingProfile: false,
      isLoadingOffers: false,
      profileError: null,
      offersError: null,
      refresh: mocks.refresh,
    });

    render(<UserProfileClient userId="u1" />);

    await user.click(screen.getByRole('button', { name: 'Wróć do poprzedniej strony' }));

    expect(backSpy).toHaveBeenCalledTimes(1);
  });

  it('renders profile header and offers section, and refresh button calls refresh', async () => {
    const user = userEvent.setup();

    mocks.useUserProfile.mockReturnValue({
      profile: { first_name: 'Jan', last_name: 'Kowalski', active_offers_count: 2 },
      offers: [],
      isLoadingProfile: false,
      isLoadingOffers: false,
      profileError: null,
      offersError: null,
      refresh: mocks.refresh,
    });

    render(<UserProfileClient userId="u1" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Jan Kowalski' })).toBeInTheDocument();
    expect(screen.getByText('Aktywne oferty')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Odśwież profil i oferty' }));
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });
});
