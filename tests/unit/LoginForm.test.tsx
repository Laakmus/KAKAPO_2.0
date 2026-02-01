import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/components/LoginForm';
import type { ApiErrorResponse, AuthTokensResponse } from '@/types';

const mocks = vi.hoisted(() => ({
  useLogin: vi.fn(),
  login: vi.fn(),
  clearNotification: vi.fn(),
}));

vi.mock('@/hooks/useLogin', () => ({
  useLogin: mocks.useLogin,
}));

describe('LoginForm', () => {
  beforeEach(() => {
    mocks.login.mockReset();
    mocks.clearNotification.mockReset();
    mocks.useLogin.mockReturnValue({
      isLoading: false,
      notification: undefined,
      login: mocks.login,
      clearNotification: mocks.clearNotification,
    });
  });

  it('renders fields, submit button and footer link by default', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Hasło')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zaloguj się' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Zarejestruj się' })).toHaveAttribute('href', '/signup');
  });

  it('auto-focuses email input on mount', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText('Email')).toHaveFocus();
  });

  it('supports initialValues and can hide footer link', () => {
    render(<LoginForm initialValues={{ email: 'x@y.pl', password: 'secret12' }} showFooterLink={false} />);
    expect(screen.getByLabelText('Email')).toHaveValue('x@y.pl');
    expect(screen.getByLabelText('Hasło')).toHaveValue('secret12');
    expect(screen.queryByRole('link', { name: 'Zarejestruj się' })).not.toBeInTheDocument();
  });

  it('submits values (email is trimmed/lowercased by schema) and calls onSuccess on success', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    const tokens: AuthTokensResponse = {
      access_token: 'a',
      refresh_token: 'r',
      user: { id: 'u1', email: 'test@example.com' },
    };

    mocks.login.mockResolvedValue({ success: true, data: tokens });

    render(<LoginForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText('Email'), '  TEST@EXAMPLE.COM  ');
    await user.type(screen.getByLabelText('Hasło'), '123456');
    await user.click(screen.getByRole('button', { name: 'Zaloguj się' }));

    expect(mocks.clearNotification).toHaveBeenCalledTimes(1);
    expect(mocks.login).toHaveBeenCalledWith({ email: 'test@example.com', password: '123456' });

    expect(onSuccess).toHaveBeenCalledWith(tokens);
    expect(await screen.findByRole('button', { name: 'Przekierowywanie...' })).toBeDisabled();
  });

  it('maps API error to email field when error.details.field=email', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();

    const apiError: ApiErrorResponse = {
      error: { code: 'BAD_REQUEST', message: 'Email jest niepoprawny', details: { field: 'email' } },
    };
    mocks.login.mockResolvedValue({ success: false, error: apiError });

    render(<LoginForm onError={onError} />);

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Hasło'), '123456');
    await user.click(screen.getByRole('button', { name: 'Zaloguj się' }));

    expect(await screen.findByText('Email jest niepoprawny')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith(apiError);
  });

  it('maps API error to password field when message contains "hasło"', async () => {
    const user = userEvent.setup();

    const apiError: ApiErrorResponse = {
      error: { code: 'UNAUTHORIZED', message: 'Nieprawidłowe hasło' },
    };
    mocks.login.mockResolvedValue({ success: false, error: apiError });

    render(<LoginForm />);

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Hasło'), '123456');
    await user.click(screen.getByRole('button', { name: 'Zaloguj się' }));

    expect(await screen.findByText('Nieprawidłowe hasło')).toBeInTheDocument();
  });

  it('disables form when hook isLoading is true', () => {
    mocks.useLogin.mockReturnValue({
      isLoading: true,
      notification: undefined,
      login: mocks.login,
      clearNotification: mocks.clearNotification,
    });

    render(<LoginForm />);

    expect(screen.getByLabelText('Email')).toBeDisabled();
    expect(screen.getByLabelText('Hasło')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Logowanie...' })).toBeDisabled();
  });
});
