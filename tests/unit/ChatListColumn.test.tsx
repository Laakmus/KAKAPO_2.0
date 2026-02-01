import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatListColumn } from '@/components/ChatListColumn';
import type { ChatSummaryViewModel } from '@/types';

describe('ChatListColumn', () => {
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
    {
      id: 'c2',
      status: 'ACTIVE',
      created_at: new Date('2025-01-02T10:00:00Z').toISOString(),
      other_user: { id: 'u3', name: 'Jan' },
      last_message: null,
      unread_count: 0,
      formattedLastMessageAt: 'Teraz',
      interestId: undefined,
    },
  ];

  it('calls onRefresh when clicking refresh button', async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();

    render(
      <ChatListColumn
        chats={[]}
        selectedChatId={undefined}
        onSelect={vi.fn()}
        onRefresh={onRefresh}
        isLoading={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: /odśwież listę czatów/i }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('disables refresh button when loading', () => {
    render(
      <ChatListColumn chats={[]} selectedChatId={undefined} onSelect={vi.fn()} onRefresh={vi.fn()} isLoading={true} />,
    );

    expect(screen.getByRole('button', { name: /odświeżanie listy czatów/i })).toBeDisabled();
  });

  it('renders empty state when no chats and not loading', () => {
    render(
      <ChatListColumn chats={[]} selectedChatId={undefined} onSelect={vi.fn()} onRefresh={vi.fn()} isLoading={false} />,
    );

    expect(screen.getByText('Brak czatów')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Odśwież' })).toBeInTheDocument();
  });

  it('renders list items when chats are present and not loading', () => {
    render(
      <ChatListColumn chats={chats} selectedChatId={'c1'} onSelect={vi.fn()} onRefresh={vi.fn()} isLoading={false} />,
    );

    expect(screen.getByRole('navigation', { name: 'Lista czatów' })).toBeInTheDocument();
    expect(screen.getByText('Anna')).toBeInTheDocument();
    expect(screen.getByText('Jan')).toBeInTheDocument();
  });

  it('supports ArrowDown/ArrowUp keyboard navigation when a chat is selected', () => {
    const onSelect = vi.fn();

    render(
      <ChatListColumn chats={chats} selectedChatId={'c1'} onSelect={onSelect} onRefresh={vi.fn()} isLoading={false} />,
    );

    const nav = screen.getByRole('navigation', { name: 'Lista czatów' });

    fireEvent.keyDown(nav, { key: 'ArrowDown' });
    expect(onSelect).toHaveBeenCalledWith('c2');

    fireEvent.keyDown(nav, { key: 'ArrowUp' });
    // from c1, ArrowUp wraps to last
    expect(onSelect).toHaveBeenCalledWith('c2');
  });

  it('does not navigate with arrow keys when no selectedChatId', () => {
    const onSelect = vi.fn();

    render(
      <ChatListColumn
        chats={chats}
        selectedChatId={undefined}
        onSelect={onSelect}
        onRefresh={vi.fn()}
        isLoading={false}
      />,
    );

    const nav = screen.getByRole('navigation', { name: 'Lista czatów' });
    fireEvent.keyDown(nav, { key: 'ArrowDown' });

    expect(onSelect).not.toHaveBeenCalled();
  });
});
