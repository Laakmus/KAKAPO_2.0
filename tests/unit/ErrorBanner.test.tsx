import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBanner } from '@/components/ErrorBanner';

describe('ErrorBanner', () => {
  describe('rendering', () => {
    it('renders error message correctly', () => {
      // Arrange
      const mockRetry = vi.fn();
      const errorMessage = 'Wystąpił błąd podczas ładowania danych';

      // Act
      render(<ErrorBanner message={errorMessage} onRetry={mockRetry} />);

      // Assert
      expect(screen.getByText('Wystąpił błąd')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('displays error icon', () => {
      // Arrange
      const mockRetry = vi.fn();

      // Act
      const { container } = render(<ErrorBanner message="Błąd" onRetry={mockRetry} />);

      // Assert
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('text-destructive');
    });

    it('applies destructive styling to card', () => {
      // Arrange
      const mockRetry = vi.fn();

      // Act
      const { container } = render(<ErrorBanner message="Błąd" onRetry={mockRetry} />);

      // Assert
      const card = container.querySelector('.border-destructive.bg-destructive\\/10');
      expect(card).toBeInTheDocument();
    });
  });

  describe('non-auth errors', () => {
    it('displays "Spróbuj ponownie" button', () => {
      // Arrange
      const mockRetry = vi.fn();

      // Act
      render(<ErrorBanner message="Błąd" onRetry={mockRetry} />);

      // Assert
      expect(screen.getByRole('button', { name: /spróbuj ponownie/i })).toBeInTheDocument();
    });

    it('calls onRetry when retry button is clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockRetry = vi.fn();
      render(<ErrorBanner message="Błąd" onRetry={mockRetry} />);

      // Act
      const retryButton = screen.getByRole('button', { name: /spróbuj ponownie/i });
      await user.click(retryButton);

      // Assert
      expect(mockRetry).toHaveBeenCalledOnce();
    });

    it('calls onRetry multiple times when clicked multiple times', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockRetry = vi.fn();
      render(<ErrorBanner message="Błąd" onRetry={mockRetry} />);

      // Act
      const retryButton = screen.getByRole('button', { name: /spróbuj ponownie/i });
      await user.click(retryButton);
      await user.click(retryButton);
      await user.click(retryButton);

      // Assert
      expect(mockRetry).toHaveBeenCalledTimes(3);
    });
  });

  describe('auth errors', () => {
    it('displays "Wymagana jest autoryzacja" heading for auth errors', () => {
      // Arrange
      const mockRetry = vi.fn();

      // Act
      render(<ErrorBanner message="Musisz być zalogowany" onRetry={mockRetry} isAuthError={true} />);

      // Assert
      expect(screen.getByText('Wymagana jest autoryzacja')).toBeInTheDocument();
    });

    it('displays "Zaloguj się" link for auth errors', () => {
      // Arrange
      const mockRetry = vi.fn();

      // Act
      render(<ErrorBanner message="Wymagana autoryzacja" onRetry={mockRetry} isAuthError={true} />);

      // Assert
      const loginLink = screen.getByRole('link', { name: /zaloguj się/i });
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute('href', '/login');
    });

    it('does not display retry button for auth errors', () => {
      // Arrange
      const mockRetry = vi.fn();

      // Act
      render(<ErrorBanner message="Auth error" onRetry={mockRetry} isAuthError={true} />);

      // Assert
      expect(screen.queryByRole('button', { name: /spróbuj ponownie/i })).not.toBeInTheDocument();
    });

    it('does not call onRetry for auth errors', () => {
      // Arrange
      const mockRetry = vi.fn();

      // Act
      render(<ErrorBanner message="Auth error" onRetry={mockRetry} isAuthError={true} />);

      // Assert - onRetry nie powinno być wywołane bo nie ma przycisku retry
      expect(mockRetry).not.toHaveBeenCalled();
    });
  });

  describe('prop variations', () => {
    it('isAuthError defaults to false when not provided', () => {
      // Arrange
      const mockRetry = vi.fn();

      // Act
      render(<ErrorBanner message="Błąd" onRetry={mockRetry} />);

      // Assert - powinien wyświetlić przycisk retry (nie link login)
      expect(screen.getByRole('button', { name: /spróbuj ponownie/i })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /zaloguj się/i })).not.toBeInTheDocument();
    });
  });
});
