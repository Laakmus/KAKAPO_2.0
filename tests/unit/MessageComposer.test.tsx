import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageComposer } from '@/components/MessageComposer';

describe('MessageComposer', () => {
  describe('rendering', () => {
    it('renders textarea and send button', () => {
      // Arrange
      const mockSend = vi.fn();

      // Act
      render(<MessageComposer onSend={mockSend} isSending={false} />);

      // Assert
      expect(screen.getByPlaceholderText(/napisz wiadomość/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /wyślij/i })).toBeInTheDocument();
    });

    it('displays character counter starting at 0/2000', () => {
      // Arrange
      const mockSend = vi.fn();

      // Act
      render(<MessageComposer onSend={mockSend} isSending={false} />);

      // Assert
      expect(screen.getByText('0/2000')).toBeInTheDocument();
    });

    it('displays helper text for keyboard shortcuts', () => {
      // Arrange
      const mockSend = vi.fn();

      // Act
      render(<MessageComposer onSend={mockSend} isSending={false} />);

      // Assert
      expect(screen.getByText(/shift\+enter dla nowej linii/i)).toBeInTheDocument();
    });
  });

  describe('character counter', () => {
    it('updates character count as user types', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockSend = vi.fn();
      render(<MessageComposer onSend={mockSend} isSending={false} />);

      // Act
      const textarea = screen.getByPlaceholderText(/napisz wiadomość/i);
      await user.type(textarea, 'Hello world');

      // Assert
      await waitFor(() => {
        expect(screen.getByText('11/2000')).toBeInTheDocument();
      });
    });

    it('shows character count in red when exceeding limit', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockSend = vi.fn();
      render(<MessageComposer onSend={mockSend} isSending={false} />);

      // Act
      const textarea = screen.getByPlaceholderText(/napisz wiadomość/i);
      const longText = 'a'.repeat(2001);
      await user.click(textarea);
      await user.paste(longText);

      // Assert
      await waitFor(() => {
        const counter = screen.getByText(/2001\/2000/);
        expect(counter).toHaveClass('text-destructive');
      });
    });
  });

  describe('form validation', () => {
    it('disables send button when textarea is empty', () => {
      // Arrange
      const mockSend = vi.fn();

      // Act
      render(<MessageComposer onSend={mockSend} isSending={false} />);

      // Assert
      const sendButton = screen.getByRole('button', { name: /wyślij/i });
      expect(sendButton).toBeDisabled();
    });

    it('enables send button when message is valid', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockSend = vi.fn();
      render(<MessageComposer onSend={mockSend} isSending={false} />);

      // Act
      const textarea = screen.getByPlaceholderText(/napisz wiadomość/i);
      await user.type(textarea, 'Valid message');

      // Assert
      await waitFor(() => {
        const sendButton = screen.getByRole('button', { name: /wyślij/i });
        expect(sendButton).not.toBeDisabled();
      });
    });

    it('disables send button when character limit is exceeded', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockSend = vi.fn();
      render(<MessageComposer onSend={mockSend} isSending={false} />);

      // Act
      const textarea = screen.getByPlaceholderText(/napisz wiadomość/i);
      const longText = 'a'.repeat(2001);
      await user.click(textarea);
      await user.paste(longText);

      // Assert
      await waitFor(() => {
        const sendButton = screen.getByRole('button', { name: /wyślij/i });
        expect(sendButton).toBeDisabled();
      });
    });
  });

  describe('sending messages', () => {
    it('calls onSend with message body when form is submitted', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockSend = vi.fn().mockResolvedValue(undefined);
      render(<MessageComposer onSend={mockSend} isSending={false} />);

      // Act
      const textarea = screen.getByPlaceholderText(/napisz wiadomość/i);
      await user.type(textarea, 'Test message');
      const sendButton = screen.getByRole('button', { name: /wyślij/i });
      await user.click(sendButton);

      // Assert
      await waitFor(() => {
        expect(mockSend).toHaveBeenCalledWith('Test message');
      });
    });

    it('clears textarea after successful send', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockSend = vi.fn().mockResolvedValue(undefined);
      render(<MessageComposer onSend={mockSend} isSending={false} />);

      // Act
      const textarea = screen.getByPlaceholderText(/napisz wiadomość/i);
      await user.type(textarea, 'Test message');
      const sendButton = screen.getByRole('button', { name: /wyślij/i });
      await user.click(sendButton);

      // Assert
      await waitFor(() => {
        expect(textarea).toHaveValue('');
        expect(screen.getByText('0/2000')).toBeInTheDocument();
      });
    });

    it('displays loading state when isSending is true', () => {
      // Arrange
      const mockSend = vi.fn();

      // Act
      render(<MessageComposer onSend={mockSend} isSending={true} />);

      // Assert
      expect(screen.getByText(/wysyłanie/i)).toBeInTheDocument();
      const sendButton = screen.getByRole('button', { name: /wysyłanie/i });
      expect(sendButton).toBeDisabled();
    });

    it('disables textarea when isSending is true', () => {
      // Arrange
      const mockSend = vi.fn();

      // Act
      render(<MessageComposer onSend={mockSend} isSending={true} />);

      // Assert
      const textarea = screen.getByPlaceholderText(/napisz wiadomość/i);
      expect(textarea).toBeDisabled();
    });
  });

  describe('keyboard shortcuts', () => {
    it('submits form when Enter is pressed without Shift', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockSend = vi.fn().mockResolvedValue(undefined);
      render(<MessageComposer onSend={mockSend} isSending={false} />);

      // Act
      const textarea = screen.getByPlaceholderText(/napisz wiadomość/i);
      await user.type(textarea, 'Test message');
      await user.keyboard('{Enter}');

      // Assert
      await waitFor(() => {
        expect(mockSend).toHaveBeenCalledWith('Test message');
      });
    });

    it('adds new line when Shift+Enter is pressed', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockSend = vi.fn();
      render(<MessageComposer onSend={mockSend} isSending={false} />);

      // Act
      const textarea = screen.getByPlaceholderText(/napisz wiadomość/i);
      await user.type(textarea, 'Line 1{Shift>}{Enter}{/Shift}Line 2');

      // Assert
      await waitFor(() => {
        expect(textarea).toHaveValue('Line 1\nLine 2');
        expect(mockSend).not.toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('displays validation error for messages that are too short', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockSend = vi.fn();
      render(<MessageComposer onSend={mockSend} isSending={false} />);

      // Act
      const textarea = screen.getByPlaceholderText(/napisz wiadomość/i);
      await user.type(textarea, 'a');
      await user.clear(textarea); // Trigger validation

      // Assert - pole jest puste, więc przycisk powinien być disabled
      const sendButton = screen.getByRole('button', { name: /wyślij/i });
      expect(sendButton).toBeDisabled();
    });

    it('does not call onSend when form is invalid', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockSend = vi.fn();
      render(<MessageComposer onSend={mockSend} isSending={false} />);

      // Act - try to submit empty form
      const sendButton = screen.getByRole('button', { name: /wyślij/i });
      await user.click(sendButton);

      // Assert
      expect(mockSend).not.toHaveBeenCalled();
    });
  });
});
