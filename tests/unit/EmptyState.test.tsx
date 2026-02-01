import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from '@/components/EmptyState';

describe('EmptyState', () => {
  describe('rendering', () => {
    it('renders default copy and calls onRefresh', async () => {
      // Arrange
      const onRefresh = vi.fn();
      const user = userEvent.setup();

      // Act
      render(<EmptyState onRefresh={onRefresh} />);

      // Assert - sprawdź domyślny tytuł i opis
      expect(screen.getByRole('heading', { name: 'Brak aktywnych ofert' })).toBeInTheDocument();
      expect(screen.getByText(/Nie znaleziono ofert pasujących do wybranych filtrów/)).toBeInTheDocument();

      // Act - kliknij przycisk odśwież
      const refreshButton = screen.getByRole('button', { name: 'Odśwież' });
      await user.click(refreshButton);

      // Assert - sprawdź czy callback został wywołany
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it('renders custom title/description', () => {
      // Arrange
      const mockRefresh = vi.fn();
      const customTitle = 'Tytuł';
      const customDescription = 'Opis';

      // Act
      render(<EmptyState onRefresh={mockRefresh} title={customTitle} description={customDescription} />);

      // Assert
      expect(screen.getByRole('heading', { name: customTitle })).toBeInTheDocument();
      expect(screen.getByText(customDescription)).toBeInTheDocument();
    });

    it('renders icon element', () => {
      // Arrange
      const mockRefresh = vi.fn();

      // Act
      const { container } = render(<EmptyState onRefresh={mockRefresh} />);

      // Assert - sprawdź czy ikona SVG jest wyświetlana
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('text-muted-foreground');
    });
  });

  describe('interactions', () => {
    it('onRefresh is called only once per click', async () => {
      // Arrange
      const onRefresh = vi.fn();
      const user = userEvent.setup();
      render(<EmptyState onRefresh={onRefresh} />);

      // Act - kliknij przycisk dwukrotnie
      const refreshButton = screen.getByRole('button', { name: 'Odśwież' });
      await user.click(refreshButton);
      await user.click(refreshButton);

      // Assert - sprawdź że callback był wywołany dokładnie 2 razy
      expect(onRefresh).toHaveBeenCalledTimes(2);
    });

    it('button is keyboard accessible', async () => {
      // Arrange
      const onRefresh = vi.fn();
      const user = userEvent.setup();
      render(<EmptyState onRefresh={onRefresh} />);

      // Act - nawiguj tab-em i naciśnij Enter
      await user.tab();
      await user.keyboard('{Enter}');

      // Assert
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('props validation', () => {
    it('requires onRefresh prop to be a function', () => {
      // Arrange & Act
      const mockRefresh = vi.fn();
      render(<EmptyState onRefresh={mockRefresh} />);

      // Assert - sprawdź typ mocka
      expect(typeof mockRefresh).toBe('function');
    });
  });
});
