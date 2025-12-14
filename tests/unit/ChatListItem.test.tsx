import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatListItem } from '@/components/ChatListItem';
import type { ChatSummaryViewModel } from '@/types';

describe('ChatListItem', () => {
  const baseChat: ChatSummaryViewModel = {
    id: 'chat-1',
    status: 'ACTIVE',
    created_at: new Date('2025-01-01T10:00:00Z').toISOString(),
    other_user: { id: 'u2', name: 'Anna Nowak' },
    last_message: {
      body: 'Hello',
      sender_id: 'u2',
      created_at: new Date('2025-01-02T10:00:00Z').toISOString(),
    },
    unread_count: 3,
    formattedLastMessageAt: 'Wczoraj',
    interestId: undefined,
  };

  it('calls onSelect on click', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<ChatListItem chat={baseChat} isActive={false} onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: /czat z anna nowak/i }));
    expect(onSelect).toHaveBeenCalledWith('chat-1');
  });

  it('calls onSelect on Enter and Space', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<ChatListItem chat={baseChat} isActive={false} onSelect={onSelect} />);

    const item = screen.getByRole('button', { name: /czat z anna nowak/i });
    item.focus();

    await user.keyboard('{Enter}');
    await user.keyboard(' ');

    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenNthCalledWith(1, 'chat-1');
    expect(onSelect).toHaveBeenNthCalledWith(2, 'chat-1');
  });

  it('renders unread badge and includes unread info in aria-label', () => {
    render(<ChatListItem chat={baseChat} isActive={false} onSelect={vi.fn()} />);

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /3 nieprzeczytanych wiadomości/i })).toBeInTheDocument();
  });

  it('does not render unread badge when unread_count is 0', () => {
    render(<ChatListItem chat={{ ...baseChat, unread_count: 0 }} isActive={false} onSelect={vi.fn()} />);

    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('renders status label based on chat.status', () => {
    const { rerender } = render(<ChatListItem chat={baseChat} isActive={false} onSelect={vi.fn()} />);
    expect(screen.getByText('Aktywny')).toBeInTheDocument();

    rerender(<ChatListItem chat={{ ...baseChat, status: 'ARCHIVED' }} isActive={false} onSelect={vi.fn()} />);
    expect(screen.getByText('Archiwizowany')).toBeInTheDocument();
  });

  it('shows "Nieaktywny" badge when chat.is_locked is true', () => {
    render(<ChatListItem chat={{ ...baseChat, is_locked: true }} isActive={false} onSelect={vi.fn()} />);

    expect(screen.getByText('Nieaktywny')).toBeInTheDocument();
  });

  it('sets aria-current="true" when active', () => {
    render(<ChatListItem chat={baseChat} isActive={true} onSelect={vi.fn()} />);

    expect(screen.getByRole('button', { name: /czat z anna nowak/i })).toHaveAttribute('aria-current', 'true');
  });

  it('truncates long last message preview', () => {
    const longBody = 'a'.repeat(80);

    render(
      <ChatListItem
        chat={{
          ...baseChat,
          last_message: {
            body: longBody,
            sender_id: 'u2',
            created_at: new Date('2025-01-02T10:00:00Z').toISOString(),
          },
        }}
        isActive={false}
        onSelect={vi.fn()}
      />,
    );

    // maxLength = 60 + "..."
    expect(screen.getByText(`${'a'.repeat(60)}...`)).toBeInTheDocument();
  });

  it('shows "Brak wiadomości" when there is no last_message.body', () => {
    render(
      <ChatListItem
        chat={{
          ...baseChat,
          last_message: null,
        }}
        isActive={false}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('Brak wiadomości')).toBeInTheDocument();
  });
});
