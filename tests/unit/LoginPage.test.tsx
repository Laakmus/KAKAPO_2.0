import { render, screen, act } from '@testing-library/react';
import { LoginPage } from '@/components/LoginPage';
import type { AuthTokensResponse } from '@/types';

const mocks = vi.hoisted(() => ({
  LoginForm: vi.fn(),
  hardNavigate: vi.fn(),
}));

vi.mock('@/components/LoginForm', () => ({
  LoginForm: (props: { onSuccess?: (t: AuthTokensResponse) => void }) => {
    mocks.LoginForm(props);
    return <div data-testid="LoginForm" />;
  },
}));

vi.mock('@/utils/navigation', () => ({
  hardNavigate: mocks.hardNavigate,
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.hardNavigate.mockReset();
    mocks.LoginForm.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders heading and LoginForm', () => {
    render(<LoginPage />);

    expect(screen.getByRole('heading', { name: 'Zaloguj się' })).toBeInTheDocument();
    expect(screen.getByTestId('LoginForm')).toBeInTheDocument();
  });

  it('redirects to safe redirect param on login success', async () => {
    window.history.pushState({}, '', '/login?redirect=/profile');
    render(<LoginPage />);

    const props = mocks.LoginForm.mock.calls[0]?.[0];
    const tokens: AuthTokensResponse = {
      access_token: 'a',
      refresh_token: 'r',
      user: { id: 'u1', email: 'test@example.com' },
    };

    act(() => {
      props.onSuccess(tokens);
    });

    // Advance timers to trigger the setTimeout (300ms delay)
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(mocks.hardNavigate).toHaveBeenCalledWith('/profile');
  });

  it('falls back to /offers when redirect is unsafe', async () => {
    window.history.pushState({}, '', '/login?redirect=https://evil.com');
    render(<LoginPage />);

    const props = mocks.LoginForm.mock.calls[0]?.[0];
    const tokens: AuthTokensResponse = {
      access_token: 'a',
      refresh_token: 'r',
      user: { id: 'u1', email: 'test@example.com' },
    };

    act(() => {
      props.onSuccess(tokens);
    });

    // Advance timers to trigger the setTimeout (300ms delay)
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(mocks.hardNavigate).toHaveBeenCalledWith('/offers');
  });
});
