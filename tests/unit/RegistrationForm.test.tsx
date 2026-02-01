import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegistrationForm } from '@/components/RegistrationForm';
import type { ApiErrorResponse, SignupResponseDTO } from '@/types';

const mocks = vi.hoisted(() => ({
  useSignup: vi.fn(),
  signup: vi.fn(),
  clearNotification: vi.fn(),
}));

vi.mock('@/hooks/useSignup', () => ({
  useSignup: mocks.useSignup,
}));

describe('RegistrationForm', () => {
  beforeEach(() => {
    mocks.signup.mockReset();
    mocks.clearNotification.mockReset();
    mocks.useSignup.mockReturnValue({
      isLoading: false,
      notification: undefined,
      signup: mocks.signup,
      clearNotification: mocks.clearNotification,
    });
  });

  it('renders all fields and submit button', () => {
    render(<RegistrationForm />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Hasło')).toBeInTheDocument();
    expect(screen.getByLabelText('Imię')).toBeInTheDocument();
    expect(screen.getByLabelText('Nazwisko')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zarejestruj się' })).toBeInTheDocument();
  });

  it('auto-focuses email input on mount', () => {
    render(<RegistrationForm />);
    expect(screen.getByLabelText('Email')).toHaveFocus();
  });

  it('supports initialValues', () => {
    render(
      <RegistrationForm
        initialValues={{ email: 'x@y.pl', password: 'secret123', first_name: 'Jan', last_name: 'Kowalski' }}
      />,
    );

    expect(screen.getByLabelText('Email')).toHaveValue('x@y.pl');
    expect(screen.getByLabelText('Hasło')).toHaveValue('secret123');
    expect(screen.getByLabelText('Imię')).toHaveValue('Jan');
    expect(screen.getByLabelText('Nazwisko')).toHaveValue('Kowalski');
  });

  it('submits values and calls onSuccess on success (then disables form)', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    const result: SignupResponseDTO = {
      user: { id: 'u1', email: 'test@example.com', email_confirmed_at: null },
      message: 'OK',
    };

    mocks.signup.mockResolvedValue({ success: true, data: result });

    render(<RegistrationForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText('Email'), '  TEST@EXAMPLE.COM ');
    await user.type(screen.getByLabelText('Hasło'), '12345678');
    await user.type(screen.getByLabelText('Imię'), 'Jan');
    await user.type(screen.getByLabelText('Nazwisko'), 'Kowalski');
    await user.click(screen.getByRole('button', { name: 'Zarejestruj się' }));

    expect(mocks.clearNotification).toHaveBeenCalledTimes(1);
    expect(mocks.signup).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: '12345678',
      first_name: 'Jan',
      last_name: 'Kowalski',
    });

    expect(onSuccess).toHaveBeenCalledWith('OK');
    expect(await screen.findByRole('button', { name: 'Zarejestrowano' })).toBeDisabled();
    expect(screen.getByLabelText('Email')).toBeDisabled();
  });

  it('maps API error to email field when error.details.field=email', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();

    const apiError: ApiErrorResponse = {
      error: { code: 'BAD_REQUEST', message: 'Email zajęty', details: { field: 'email' } },
    };
    mocks.signup.mockResolvedValue({ success: false, error: apiError });

    render(<RegistrationForm onError={onError} />);

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Hasło'), '12345678');
    await user.type(screen.getByLabelText('Imię'), 'Jan');
    await user.type(screen.getByLabelText('Nazwisko'), 'Kowalski');
    await user.click(screen.getByRole('button', { name: 'Zarejestruj się' }));

    expect(await screen.findByText('Email zajęty')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith(apiError);
  });

  it('maps API error to password field when message contains "hasło"', async () => {
    const user = userEvent.setup();
    const apiError: ApiErrorResponse = {
      error: { code: 'BAD_REQUEST', message: 'Hasło jest zbyt słabe' },
    };
    mocks.signup.mockResolvedValue({ success: false, error: apiError });

    render(<RegistrationForm />);

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Hasło'), '12345678');
    await user.type(screen.getByLabelText('Imię'), 'Jan');
    await user.type(screen.getByLabelText('Nazwisko'), 'Kowalski');
    await user.click(screen.getByRole('button', { name: 'Zarejestruj się' }));

    expect(await screen.findByText('Hasło jest zbyt słabe')).toBeInTheDocument();
  });

  it('disables form when hook isLoading is true', () => {
    mocks.useSignup.mockReturnValue({
      isLoading: true,
      notification: undefined,
      signup: mocks.signup,
      clearNotification: mocks.clearNotification,
    });

    render(<RegistrationForm />);

    expect(screen.getByLabelText('Email')).toBeDisabled();
    expect(screen.getByLabelText('Hasło')).toBeDisabled();
    expect(screen.getByLabelText('Imię')).toBeDisabled();
    expect(screen.getByLabelText('Nazwisko')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Rejestracja...' })).toBeDisabled();
  });
});
