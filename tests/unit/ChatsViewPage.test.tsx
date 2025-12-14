import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatsViewPage } from '@/components/ChatsViewPage';
import type { ChatDetailViewModel, ChatMessageViewModel, ChatSummaryViewModel, InterestActionContext } from '@/types';

const mocks = vi.hoisted(() => ({
  useChatsViewState: vi.fn(),
  useAuth: vi.fn(),
  useToast: vi.fn(),
}));

vi.mock('@/hooks/useChatsViewState', () => ({
  useChatsViewState: (initialChatId?: string) => mocks.useChatsViewState(initialChatId),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mocks.useAuth(),
}));

vi.mock('@/contexts/ToastContext', () => ({
  useToast: () => mocks.useToast(),
}));

describe('ChatsViewPage', () => {
  beforeEach(() => {
    mocks.useChatsViewState.mockReset();
    mocks.useAuth.mockReset();
    mocks.useToast.mockReset();
  });

  it('shows error banner when chatsError is present', () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1' } });
    mocks.useToast.mockReturnValue({ push: vi.fn() });
    mocks.useChatsViewState.mockReturnValue({
      chats: [],
      isLoadingChats: false,
      chatsError: { status: 401, error: { code: 'UNAUTHORIZED', message: 'Brak autoryzacji' } },
      selectedChatId: undefined,
      selectedChat: undefined,
      messages: [],
      isLoadingMessages: false,
      messagesError: undefined,
      interestContext: undefined,
      isSending: false,
      isRealizing: false,
      isUnrealizing: false,
      actionError: undefined,
      selectChat: vi.fn(),
      refreshChats: vi.fn(),
      refreshMessages: vi.fn(),
      sendMessage: vi.fn(),
      realizeInterest: vi.fn(),
      unrealizeInterest: vi.fn(),
    });

    render(<ChatsViewPage />);

    expect(screen.getByText('Nie udało się załadować listy czatów')).toBeInTheDocument();
  });

  it('shows "Wybierz czat" empty state when there are chats but no selectedChatId', () => {
    const chats: ChatSummaryViewModel[] = [
      {
        id: 'c1',
        status: 'ACTIVE',
        created_at: new Date('2025-01-01T10:00:00Z').toISOString(),
        other_user: { id: 'u2', name: 'Anna' },
        last_message: null,
        unread_count: 0,
        formattedLastMessageAt: 'Teraz',
        interestId: undefined,
      },
    ];

    mocks.useAuth.mockReturnValue({ user: { id: 'u1' } });
    mocks.useToast.mockReturnValue({ push: vi.fn() });
    mocks.useChatsViewState.mockReturnValue({
      chats,
      isLoadingChats: false,
      chatsError: undefined,
      selectedChatId: undefined,
      selectedChat: undefined,
      messages: [],
      isLoadingMessages: false,
      messagesError: undefined,
      interestContext: undefined,
      isSending: false,
      isRealizing: false,
      isUnrealizing: false,
      actionError: undefined,
      selectChat: vi.fn(),
      refreshChats: vi.fn(),
      refreshMessages: vi.fn(),
      sendMessage: vi.fn(),
      realizeInterest: vi.fn(),
      unrealizeInterest: vi.fn(),
    });

    render(<ChatsViewPage />);

    expect(screen.getByText('Wybierz czat')).toBeInTheDocument();
    expect(screen.getByText(/wybierz czat z listy/i)).toBeInTheDocument();
  });

  it('calls refreshMessages when clicking refresh button and shows toast on send error', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const pushToast = vi.fn();
    const refreshMessages = vi.fn();
    const sendMessage = vi.fn().mockRejectedValue(new Error('boom'));

    const chats: ChatSummaryViewModel[] = [
      {
        id: 'c1',
        status: 'ACTIVE',
        created_at: new Date('2025-01-01T10:00:00Z').toISOString(),
        other_user: { id: 'u2', name: 'Anna' },
        last_message: null,
        unread_count: 0,
        formattedLastMessageAt: 'Teraz',
        interestId: undefined,
      },
    ];

    const selectedChat: ChatDetailViewModel = {
      chatId: 'c1',
      status: 'ACTIVE',
      created_at: new Date('2025-01-01T10:00:00Z').toISOString(),
      participants: {
        me: { id: 'u1', name: 'Me' },
        other: { id: 'u2', name: 'Anna' },
      },
      offerContext: {
        myOfferId: 'o1',
        myOfferTitle: 'Moja oferta',
        theirOfferId: 'o2',
        theirOfferTitle: 'Ich oferta',
      },
      interestId: 'i1',
      realizationStatus: 'ACCEPTED',
    };

    const messages: ChatMessageViewModel[] = [];

    const interestContext: InterestActionContext = {
      interestId: 'i1',
      otherUserName: 'Anna',
      offerTitle: 'Ich oferta',
      realizationStatus: 'ACCEPTED',
    };

    mocks.useAuth.mockReturnValue({ user: { id: 'u1' } });
    mocks.useToast.mockReturnValue({ push: pushToast });
    mocks.useChatsViewState.mockReturnValue({
      chats,
      isLoadingChats: false,
      chatsError: undefined,
      selectedChatId: 'c1',
      selectedChat,
      messages,
      isLoadingMessages: false,
      messagesError: undefined,
      interestContext,
      isSending: false,
      isRealizing: false,
      isUnrealizing: false,
      actionError: undefined,
      selectChat: vi.fn(),
      refreshChats: vi.fn(),
      refreshMessages,
      sendMessage,
      realizeInterest: vi.fn().mockResolvedValue({ success: true }),
      unrealizeInterest: vi.fn().mockResolvedValue({ success: true }),
    });

    render(<ChatsViewPage />);

    await user.click(screen.getByRole('button', { name: 'Odśwież wiadomości' }));
    expect(refreshMessages).toHaveBeenCalledTimes(1);

    // Send a message via the real composer
    await user.type(screen.getByPlaceholderText(/napisz wiadomość/i), 'Hej');
    await user.click(screen.getByRole('button', { name: /wyślij/i }));

    await waitFor(() => {
      expect(pushToast).toHaveBeenCalledWith({
        type: 'error',
        text: 'Wystąpił nieoczekiwany błąd podczas wysyłania wiadomości',
      });
    });

    consoleErrorSpy.mockRestore();
  });
});
