import { render, screen } from '@testing-library/react';
import { FooterLinks } from '@/components/FooterLinks';

describe('FooterLinks', () => {
  describe('rendering', () => {
    it('renders with default login link', () => {
      // Arrange & Act
      render(<FooterLinks />);

      // Assert
      expect(screen.getByText('Masz już konto?')).toBeInTheDocument();

      const loginLink = screen.getByRole('link', { name: /zaloguj się/i });
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute('href', '/login');
    });

    it('applies default text styling', () => {
      // Arrange & Act
      const { container } = render(<FooterLinks />);

      // Assert
      const paragraph = container.querySelector('.text-center.text-sm.text-gray-600');
      expect(paragraph).toBeInTheDocument();
    });

    it('login link has correct default styling', () => {
      // Arrange & Act
      render(<FooterLinks />);

      // Assert
      const loginLink = screen.getByRole('link', { name: /zaloguj się/i });
      expect(loginLink).toHaveClass('font-medium', 'text-primary', 'hover:underline');
    });
  });

  describe('custom props', () => {
    it('renders with custom href', () => {
      // Arrange
      const customHref = '/custom-login-page';

      // Act
      render(<FooterLinks href={customHref} />);

      // Assert
      const loginLink = screen.getByRole('link', { name: /zaloguj się/i });
      expect(loginLink).toHaveAttribute('href', customHref);
    });

    it('applies custom className', () => {
      // Arrange
      const customClass = 'my-custom-footer-class';

      // Act
      const { container } = render(<FooterLinks className={customClass} />);

      // Assert
      const paragraph = container.querySelector(`.${customClass}`);
      expect(paragraph).toBeInTheDocument();
      expect(paragraph).toHaveClass('text-center', 'text-sm', 'text-gray-600', customClass);
    });

    it('combines custom className with default styles', () => {
      // Arrange
      const customClass = 'mt-4';

      // Act
      const { container } = render(<FooterLinks className={customClass} />);

      // Assert
      const paragraph = container.querySelector('p');
      expect(paragraph).toHaveClass('text-center', 'text-sm', 'text-gray-600', 'mt-4');
    });
  });

  describe('accessibility', () => {
    it('login link is keyboard accessible', () => {
      // Arrange & Act
      render(<FooterLinks />);

      // Assert
      const loginLink = screen.getByRole('link', { name: /zaloguj się/i });
      expect(loginLink).toHaveClass('focus:underline', 'focus:outline-none');
    });

    it('link has descriptive text', () => {
      // Arrange & Act
      render(<FooterLinks />);

      // Assert
      const loginLink = screen.getByRole('link', { name: /zaloguj się/i });
      expect(loginLink.textContent).toBe('Zaloguj się');
    });
  });
});
