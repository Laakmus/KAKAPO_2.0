import { render, screen } from '@testing-library/react';
import { MessageBubble } from '@/components/MessageBubble';
import type { MessageViewModel } from '@/types';

describe('MessageBubble', () => {
  let mockDate: Date;

  beforeEach(() => {
    // Ustaw stałą datę dla testów
    mockDate = new Date('2025-01-15T12:00:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createMockMessage = (overrides?: Partial<MessageViewModel>): MessageViewModel => ({
    id: '1',
    chat_id: 'chat-1',
    sender_id: 'user-1',
    sender_name: 'Jan Kowalski',
    body: 'Test message',
    created_at: new Date(Date.now() - 5 * 60000).toISOString(), // 5 minut temu
    isOwn: false,
    ...overrides,
  });

  it('renders message body correctly', () => {
    const message = createMockMessage({ body: 'Hello, this is a test message' });

    render(<MessageBubble message={message} isOwn={false} />);

    expect(screen.getByText('Hello, this is a test message')).toBeInTheDocument();
  });

  it('displays sender name for messages from others', () => {
    const message = createMockMessage({ sender_name: 'Anna Nowak' });

    render(<MessageBubble message={message} isOwn={false} />);

    expect(screen.getByText('Anna Nowak')).toBeInTheDocument();
  });

  it('does not display sender name for own messages', () => {
    const message = createMockMessage({ sender_name: 'Anna Nowak' });

    render(<MessageBubble message={message} isOwn={true} />);

    expect(screen.queryByText('Anna Nowak')).not.toBeInTheDocument();
  });

  it('applies correct styling for own messages', () => {
    const message = createMockMessage();

    const { container } = render(<MessageBubble message={message} isOwn={true} />);

    const bubble = container.querySelector('.bg-primary.text-primary-foreground');
    expect(bubble).toBeInTheDocument();
  });

  it('applies correct styling for messages from others', () => {
    const message = createMockMessage();

    const { container } = render(<MessageBubble message={message} isOwn={false} />);

    const bubble = container.querySelector('.bg-muted.text-foreground');
    expect(bubble).toBeInTheDocument();
  });

  it('does not render empty messages', () => {
    const emptyMessage = createMockMessage({ body: '' });

    const { container } = render(<MessageBubble message={emptyMessage} isOwn={false} />);

    expect(container.firstChild).toBeNull();
  });

  it('does not render whitespace-only messages', () => {
    const whitespaceMessage = createMockMessage({ body: '   ' });

    const { container } = render(<MessageBubble message={whitespaceMessage} isOwn={false} />);

    expect(container.firstChild).toBeNull();
  });

  it('formats timestamp as "Teraz" for very recent messages', () => {
    const message = createMockMessage({
      created_at: new Date(Date.now() - 30000).toISOString(), // 30 sekund temu
    });

    render(<MessageBubble message={message} isOwn={false} />);

    expect(screen.getByText('Teraz')).toBeInTheDocument();
  });

  it('formats timestamp in minutes for messages less than 1 hour old', () => {
    const message = createMockMessage({
      created_at: new Date(Date.now() - 15 * 60000).toISOString(), // 15 minut temu
    });

    render(<MessageBubble message={message} isOwn={false} />);

    expect(screen.getByText('15 min temu')).toBeInTheDocument();
  });

  it('formats timestamp in hours for messages less than 24 hours old', () => {
    const message = createMockMessage({
      created_at: new Date(Date.now() - 3 * 3600000).toISOString(), // 3 godziny temu
    });

    render(<MessageBubble message={message} isOwn={false} />);

    expect(screen.getByText('3h temu')).toBeInTheDocument();
  });

  it('formats timestamp as full date for messages older than 24 hours', () => {
    const message = createMockMessage({
      created_at: new Date(Date.now() - 48 * 3600000).toISOString(), // 2 dni temu
    });

    render(<MessageBubble message={message} isOwn={false} />);

    const timestampElement = screen.getByText(/\d{2}\.\d{2}\.\d{4}/);
    expect(timestampElement).toBeInTheDocument();
  });

  it('preserves whitespace in message body', () => {
    const message = createMockMessage({ body: 'Line 1\nLine 2\nLine 3' });

    const { container } = render(<MessageBubble message={message} isOwn={false} />);

    const messageText = container.querySelector('.whitespace-pre-wrap');
    expect(messageText).toBeInTheDocument();
    expect(messageText?.textContent).toBe('Line 1\nLine 2\nLine 3');
  });

  it('aligns own messages to the right', () => {
    const message = createMockMessage();

    const { container } = render(<MessageBubble message={message} isOwn={true} />);

    const messageContainer = container.querySelector('.items-end');
    expect(messageContainer).toBeInTheDocument();
  });

  it('aligns messages from others to the left', () => {
    const message = createMockMessage();

    const { container } = render(<MessageBubble message={message} isOwn={false} />);

    const messageContainer = container.querySelector('.items-start');
    expect(messageContainer).toBeInTheDocument();
  });
});
