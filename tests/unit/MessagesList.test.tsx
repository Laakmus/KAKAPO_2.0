import { render, screen } from '@testing-library/react';
import { MessagesList } from '@/components/MessagesList';
import type { MessageViewModel } from '@/types';

describe('MessagesList', () => {
  const mockMessages: MessageViewModel[] = [
    {
      id: '1',
      chat_id: 'chat-1',
      sender_id: 'user-1',
      sender_name: 'Jan Kowalski',
      body: 'First message',
      created_at: new Date('2025-01-15T10:00:00Z').toISOString(),
      isOwn: true,
    },
    {
      id: '2',
      chat_id: 'chat-1',
      sender_id: 'user-2',
      sender_name: 'Anna Nowak',
      body: 'Second message',
      created_at: new Date('2025-01-15T10:05:00Z').toISOString(),
      isOwn: false,
    },
    {
      id: '3',
      chat_id: 'chat-1',
      sender_id: 'user-1',
      sender_name: 'Jan Kowalski',
      body: 'Third message',
      created_at: new Date('2025-01-15T10:10:00Z').toISOString(),
      isOwn: true,
    },
  ];

  describe('rendering with messages', () => {
    it('renders all messages in the list', () => {
      // Arrange & Act
      render(<MessagesList messages={mockMessages} currentUserId="user-1" />);

      // Assert
      expect(screen.getByText('First message')).toBeInTheDocument();
      expect(screen.getByText('Second message')).toBeInTheDocument();
      expect(screen.getByText('Third message')).toBeInTheDocument();
    });

    it('correctly identifies own messages', () => {
      // Arrange
      const { container } = render(<MessagesList messages={mockMessages} currentUserId="user-1" />);

      // Assert - własne wiadomości powinny mieć klasę .items-end
      const ownMessageContainers = container.querySelectorAll('.items-end');
      expect(ownMessageContainers.length).toBe(2); // user-1 ma 2 wiadomości
    });

    it('correctly identifies messages from others', () => {
      // Arrange
      const { container } = render(<MessagesList messages={mockMessages} currentUserId="user-1" />);

      // Assert - wiadomości od innych powinny mieć klasę .items-start
      const otherMessageContainers = container.querySelectorAll('.items-start');
      expect(otherMessageContainers.length).toBe(1); // user-2 ma 1 wiadomość
    });

    it('displays sender name for messages from others', () => {
      // Arrange & Act
      render(<MessagesList messages={mockMessages} currentUserId="user-1" />);

      // Assert
      expect(screen.getByText('Anna Nowak')).toBeInTheDocument();
    });

    it('does not display sender name for own messages', () => {
      // Arrange & Act
      render(<MessagesList messages={mockMessages} currentUserId="user-1" />);

      // Assert - "Jan Kowalski" nie powinno być widoczne (własne wiadomości)
      expect(screen.queryByText('Jan Kowalski')).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('displays empty state when there are no messages', () => {
      // Arrange & Act
      render(<MessagesList messages={[]} currentUserId="user-1" isLoading={false} />);

      // Assert
      expect(screen.getByText('Brak wiadomości')).toBeInTheDocument();
      expect(screen.getByText(/rozpocznij konwersację wysyłając pierwszą wiadomość/i)).toBeInTheDocument();
    });

    it('does not display empty state when loading', () => {
      // Arrange & Act
      render(<MessagesList messages={[]} currentUserId="user-1" isLoading={true} />);

      // Assert
      expect(screen.queryByText('Brak wiadomości')).not.toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('displays loading skeletons when isLoading is true', () => {
      // Arrange & Act
      const { container } = render(<MessagesList messages={[]} currentUserId="user-1" isLoading={true} />);

      // Assert
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('displays 3 skeleton placeholders', () => {
      // Arrange & Act
      const { container } = render(<MessagesList messages={[]} currentUserId="user-1" isLoading={true} />);

      // Assert
      const skeletonContainers = container.querySelectorAll('.animate-pulse');
      // Każdy skeleton ma 3 elementy (sender, body, timestamp)
      expect(skeletonContainers.length).toBeGreaterThanOrEqual(3);
    });

    it('alternates skeleton alignment for visual variety', () => {
      // Arrange & Act
      const { container } = render(<MessagesList messages={[]} currentUserId="user-1" isLoading={true} />);

      // Assert
      const leftAligned = container.querySelectorAll('.justify-start');
      const rightAligned = container.querySelectorAll('.justify-end');

      expect(leftAligned.length).toBeGreaterThan(0);
      expect(rightAligned.length).toBeGreaterThan(0);
    });
  });

  describe('scroll behavior', () => {
    it('renders messagesEndRef element for auto-scrolling', () => {
      // Arrange
      const mockRef = { current: document.createElement('div') as HTMLDivElement };

      // Act
      const { container } = render(
        <MessagesList messages={mockMessages} currentUserId="user-1" messagesEndRef={mockRef} />,
      );

      // Assert - element z ref powinien istnieć na końcu listy
      const messagesContainer = container.querySelector('.overflow-y-auto');
      expect(messagesContainer).toBeInTheDocument();
    });

    it('applies overflow-y-auto class for scrolling', () => {
      // Arrange & Act
      const { container } = render(<MessagesList messages={mockMessages} currentUserId="user-1" />);

      // Assert
      const scrollContainer = container.querySelector('.overflow-y-auto');
      expect(scrollContainer).toBeInTheDocument();
    });
  });

  describe('message filtering', () => {
    it('does not render messages with empty body', () => {
      // Arrange
      const messagesWithEmpty: MessageViewModel[] = [
        ...mockMessages,
        {
          id: '4',
          chat_id: 'chat-1',
          sender_id: 'user-1',
          sender_name: 'Jan Kowalski',
          body: '',
          created_at: new Date('2025-01-15T10:15:00Z').toISOString(),
          isOwn: true,
        },
      ];

      // Act
      const { container } = render(<MessagesList messages={messagesWithEmpty} currentUserId="user-1" />);

      // Assert
      const messageBubbles = container.querySelectorAll('[class*="flex-col mb-4"]');
      expect(messageBubbles.length).toBe(3); // Tylko 3 niepuste wiadomości
    });

    it('does not render messages with whitespace-only body', () => {
      // Arrange
      const messagesWithWhitespace: MessageViewModel[] = [
        ...mockMessages,
        {
          id: '5',
          chat_id: 'chat-1',
          sender_id: 'user-1',
          sender_name: 'Jan Kowalski',
          body: '   ',
          created_at: new Date('2025-01-15T10:20:00Z').toISOString(),
          isOwn: true,
        },
      ];

      // Act
      const { container } = render(<MessagesList messages={messagesWithWhitespace} currentUserId="user-1" />);

      // Assert
      const messageBubbles = container.querySelectorAll('[class*="flex-col mb-4"]');
      expect(messageBubbles.length).toBe(3); // Tylko 3 niepuste wiadomości
    });
  });

  describe('styling and layout', () => {
    it('applies correct container styling', () => {
      // Arrange & Act
      const { container } = render(<MessagesList messages={mockMessages} currentUserId="user-1" />);

      // Assert
      const messagesContainer = container.querySelector('.overflow-y-auto.p-4');
      expect(messagesContainer).toBeInTheDocument();
    });
  });
});
