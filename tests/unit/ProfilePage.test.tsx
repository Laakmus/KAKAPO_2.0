import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfilePage } from '@/components/ProfilePage';
import type { ApiErrorViewModel, DeleteAccountCommand, ProfileEditPayload, UserProfileDTO } from '@/types';

const mocks = vi.hoisted(() => ({
  useProfile: vi.fn(),
  useProfileActions: vi.fn(),
  useToast: vi.fn(),

  refetch: vi.fn(),
  editProfile: vi.fn(),
  deleteAccount: vi.fn(),
  pushToast: vi.fn(),

  LoadingSkeleton: vi.fn(),
  ErrorBanner: vi.fn(),
  ProfileHeader: vi.fn(),
  ProfileStats: vi.fn(),
  ProfileViewMode: vi.fn(),
  ProfileEditForm: vi.fn(),
  DeleteAccountDialog: vi.fn(),
}));

vi.mock('@/hooks/useProfile', () => ({
  useProfile: mocks.useProfile,
}));

vi.mock('@/hooks/useProfileActions', () => ({
  useProfileActions: mocks.useProfileActions,
}));

vi.mock('@/contexts/ToastContext', () => ({
  useToast: mocks.useToast,
}));

vi.mock('@/components/LoadingSkeleton', () => ({
  LoadingSkeleton: (props: unknown) => {
    mocks.LoadingSkeleton(props);
    return <div data-testid="LoadingSkeleton" />;
  },
}));

vi.mock('@/components/ErrorBanner', () => ({
  ErrorBanner: (props: { message: string; onRetry: () => void; isAuthError: boolean }) => {
    mocks.ErrorBanner(props);
    return (
      <div>
        <div data-testid="ErrorBanner">{props.message}</div>
        <button type="button" onClick={props.onRetry}>
          retry
        </button>
      </div>
    );
  },
}));

vi.mock('@/components/ProfileHeader', () => ({
  ProfileHeader: (props: { firstName: string; lastName: string }) => {
    mocks.ProfileHeader(props);
    return <div data-testid="ProfileHeader">{props.firstName}</div>;
  },
}));

vi.mock('@/components/ProfileStats', () => ({
  ProfileStats: (props: unknown) => {
    mocks.ProfileStats(props);
    return <div data-testid="ProfileStats" />;
  },
}));

vi.mock('@/components/ProfileViewMode', () => ({
  ProfileViewMode: (props: { onEdit: () => void; onDeleteRequest: () => void }) => {
    mocks.ProfileViewMode(props);
    return (
      <div data-testid="ProfileViewMode">
        <button type="button" onClick={props.onEdit}>
          edit
        </button>
        <button type="button" onClick={props.onDeleteRequest}>
          delete
        </button>
      </div>
    );
  },
}));

vi.mock('@/components/ProfileEditForm', () => ({
  ProfileEditForm: (props: {
    onSubmit: (payload: ProfileEditPayload) => Promise<void> | void;
    onCancel: () => void;
  }) => {
    mocks.ProfileEditForm(props);
    return (
      <div data-testid="ProfileEditForm">
        <button type="button" onClick={() => props.onSubmit({ first_name: 'Jan', last_name: 'Nowak' })}>
          submit
        </button>
        <button type="button" onClick={props.onCancel}>
          cancel
        </button>
      </div>
    );
  },
}));

vi.mock('@/components/DeleteAccountDialog', () => ({
  DeleteAccountDialog: (props: {
    isOpen: boolean;
    onCancel: () => void;
    onConfirm: (payload: DeleteAccountCommand) => Promise<void> | void;
    error?: string;
  }) => {
    mocks.DeleteAccountDialog(props);
    if (!props.isOpen) return null;
    return (
      <div data-testid="DeleteAccountDialog">
        <button type="button" onClick={() => props.onConfirm({ password: 'secret' })}>
          confirm-delete
        </button>
        <button type="button" onClick={props.onCancel}>
          cancel-delete
        </button>
      </div>
    );
  },
}));

describe('ProfilePage', () => {
  const profile: UserProfileDTO = {
    id: 'u1',
    first_name: 'Jan',
    last_name: 'Kowalski',
    email: 'jan@example.com',
    created_at: new Date('2025-01-01').toISOString(),
    active_offers_count: 3,
  };

  beforeEach(() => {
    mocks.refetch.mockReset();
    mocks.editProfile.mockReset();
    mocks.deleteAccount.mockReset();
    mocks.pushToast.mockReset();

    mocks.useToast.mockReturnValue({
      messages: [],
      push: mocks.pushToast,
      remove: vi.fn(),
      clear: vi.fn(),
    });

    mocks.useProfile.mockReturnValue({
      profile,
      isLoading: false,
      error: undefined,
      refetch: mocks.refetch,
    });

    mocks.useProfileActions.mockReturnValue({
      editProfile: mocks.editProfile,
      deleteAccount: mocks.deleteAccount,
      isSubmitting: false,
      isDeleting: false,
      error: undefined,
    });
  });

  it('renders loading state when isLoading=true', () => {
    mocks.useProfile.mockReturnValue({
      profile: null,
      isLoading: true,
      error: undefined,
      refetch: mocks.refetch,
    });

    render(<ProfilePage />);

    expect(screen.getAllByTestId('LoadingSkeleton').length).toBeGreaterThan(0);
  });

  it('renders ErrorBanner on error and retry calls refetch', async () => {
    const user = userEvent.setup();
    const error: ApiErrorViewModel = {
      error: { code: 'ERR', message: 'Coś poszło nie tak' },
      status: 500,
    };

    mocks.useProfile.mockReturnValue({
      profile: null,
      isLoading: false,
      error,
      refetch: mocks.refetch,
    });

    render(<ProfilePage />);

    expect(screen.getByTestId('ErrorBanner')).toHaveTextContent('Coś poszło nie tak');
    await user.click(screen.getByRole('button', { name: 'retry' }));
    expect(mocks.refetch).toHaveBeenCalledTimes(1);
  });

  it('toggles to edit mode and on successful submit shows success toast + refetch and exits edit mode', async () => {
    const user = userEvent.setup();

    mocks.editProfile.mockResolvedValue(profile);

    render(<ProfilePage />);

    expect(screen.getByTestId('ProfileViewMode')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'edit' }));
    expect(screen.getByTestId('ProfileEditForm')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => {
      expect(mocks.editProfile).toHaveBeenCalledWith({ first_name: 'Jan', last_name: 'Nowak' });
    });

    await waitFor(() => {
      expect(mocks.pushToast).toHaveBeenCalledWith({ type: 'success', text: 'Profil zaktualizowany pomyślnie' });
    });

    expect(mocks.refetch).toHaveBeenCalled();

    // Back to view mode
    await waitFor(() => expect(screen.getByTestId('ProfileViewMode')).toBeInTheDocument());
  });

  it('opens delete dialog and confirm triggers deleteAccount and success toast', async () => {
    const user = userEvent.setup();

    mocks.deleteAccount.mockResolvedValue(true);

    render(<ProfilePage />);

    await user.click(screen.getByRole('button', { name: 'delete' }));
    expect(screen.getByTestId('DeleteAccountDialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'confirm-delete' }));

    await waitFor(() => {
      expect(mocks.deleteAccount).toHaveBeenCalledWith({ password: 'secret' });
    });

    await waitFor(() => {
      expect(mocks.pushToast).toHaveBeenCalledWith({ type: 'success', text: 'Konto zostało usunięte' });
    });
  });
});
