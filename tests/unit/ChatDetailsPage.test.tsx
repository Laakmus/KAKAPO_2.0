import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatDetailsPage } from '@/components/ChatDetailsPage';
import type { ApiErrorViewModel, ChatDetailsViewModel, MessageViewModel } from '@/types';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useToast: vi.fn(),
  useChatDetails: vi.fn(),
  useChatMessages: vi.fn(),
  useRealizationActions: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mocks.useAuth(),
}));

vi.mock('@/contexts/ToastContext', () => ({
  useToast: () => mocks.useToast(),
}));

vi.mock('@/hooks/useChatDetails', () => ({
  useChatDetails: (chatId: string) => mocks.useChatDetails(chatId),
}));

vi.mock('@/hooks/useChatMessages', () => ({
  useChatMessages: (chatId: string, options?: unknown) => mocks.useChatMessages(chatId, options),
}));

vi.mock('@/hooks/useRealizationActions', () => ({
  useRealizationActions: (interestId: string) => mocks.useRealizationActions(interestId),
}));

describe('ChatDetailsPage', () => {
  beforeEach(() => {
    mocks.useAuth.mockReset();
    mocks.useToast.mockReset();
    mocks.useChatDetails.mockReset();
    mocks.useChatMessages.mockReset();
    mocks.useRealizationActions.mockReset();
  });

  it('shows 403/404 error UI with a back link', () => {
    const chatError: ApiErrorViewModel = {
      status: 403,
      error: { code: 'FORBIDDEN', message: 'Forbidden' },
    };

    mocks.useAuth.mockReturnValue({ user: { id: 'u1' }, token: 't' });
    mocks.useToast.mockReturnValue({ push: vi.fn() });
    mocks.useChatDetails.mockReturnValue({
      chatDetails: undefined,
      otherUser: undefined,
      isLoading: false,
      error: chatError,
      refetch: vi.fn(),
    });
    mocks.useChatMessages.mockReturnValue({
      messages: [],
      isLoading: false,
      error: undefined,
      refetch: vi.fn(),
      messagesEndRef: { current: null },
      scrollToBottom: vi.fn(),
    });
    mocks.useRealizationActions.mockReturnValue({
      realize: vi.fn(),
      unrealize: vi.fn(),
      isMutating: false,
      actionError: undefined,
    });

    render(<ChatDetailsPage chatId="chat-1" />);

    expect(screen.getByText('Brak dostępu do czatu')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /wróć do listy czatów/i })).toHaveAttribute('href', '/chats');
  });

  it('refresh button calls refetchChat and refetchMessages', async () => {
    const user = userEvent.setup();

    const refetchChat = vi.fn();
    const refetchMessages = vi.fn();

    const chatDetails: ChatDetailsViewModel = {
      id: 'chat-1',
      status: 'ACTIVE',
      created_at: new Date('2025-01-01T10:00:00Z').toISOString(),
      interest_id: 'i1',
      current_user_id: 'u1',
      current_interest_status: 'ACCEPTED',
      other_interest_status: 'PROPOSED',
      other_user: { id: 'u2', name: 'Anna' },
      related_offers: {
        my: { id: 'o1', title: 'Moja' },
        their: { id: 'o2', title: 'Ich' },
      },
      realized_at: null,
    };

    const messages: MessageViewModel[] = [];

    mocks.useAuth.mockReturnValue({ user: { id: 'u1' }, token: 't' });
    mocks.useToast.mockReturnValue({ push: vi.fn() });
    mocks.useChatDetails.mockReturnValue({
      chatDetails,
      otherUser: { id: 'u2', name: 'Anna' },
      isLoading: false,
      error: undefined,
      refetch: refetchChat,
    });
    mocks.useChatMessages.mockReturnValue({
      messages,
      isLoading: false,
      error: undefined,
      refetch: refetchMessages,
      messagesEndRef: { current: null },
      scrollToBottom: vi.fn(),
    });
    mocks.useRealizationActions.mockReturnValue({
      realize: vi.fn().mockResolvedValue({ success: true }),
      unrealize: vi.fn().mockResolvedValue({ success: true }),
      isMutating: false,
      actionError: undefined,
    });

    render(<ChatDetailsPage chatId="chat-1" />);

    await user.click(screen.getByRole('button', { name: 'Odśwież' }));

    expect(refetchChat).toHaveBeenCalledTimes(1);
    expect(refetchMessages).toHaveBeenCalledTimes(1);
  });

  it('shows toast error and does not call fetch when sending without token', async () => {
    const user = userEvent.setup();

    const pushToast = vi.fn();

    const chatDetails: ChatDetailsViewModel = {
      id: 'chat-1',
      status: 'ACTIVE',
      created_at: new Date('2025-01-01T10:00:00Z').toISOString(),
      interest_id: 'i1',
      current_user_id: 'u1',
      current_interest_status: 'ACCEPTED',
      other_interest_status: 'PROPOSED',
      other_user: { id: 'u2', name: 'Anna' },
    };

    mocks.useAuth.mockReturnValue({ user: { id: 'u1' }, token: undefined });
    mocks.useToast.mockReturnValue({ push: pushToast });
    mocks.useChatDetails.mockReturnValue({
      chatDetails,
      otherUser: { id: 'u2', name: 'Anna' },
      isLoading: false,
      error: undefined,
      refetch: vi.fn(),
    });
    mocks.useChatMessages.mockReturnValue({
      messages: [],
      isLoading: false,
      error: undefined,
      refetch: vi.fn(),
      messagesEndRef: { current: null },
      scrollToBottom: vi.fn(),
    });
    mocks.useRealizationActions.mockReturnValue({
      realize: vi.fn(),
      unrealize: vi.fn(),
      isMutating: false,
      actionError: undefined,
    });

    const fetchSpy = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).fetch = fetchSpy;

    render(<ChatDetailsPage chatId="chat-1" />);

    await user.type(screen.getByPlaceholderText(/napisz wiadomość/i), 'Hej');
    await user.click(screen.getByRole('button', { name: /wyślij/i }));

    await waitFor(() => {
      expect(pushToast).toHaveBeenCalledWith({
        type: 'error',
        text: 'Brak autoryzacji. Zaloguj się ponownie.',
      });
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
