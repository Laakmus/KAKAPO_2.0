import { render, screen } from '@testing-library/react';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

describe('LoadingSkeleton', () => {
  describe('default variant', () => {
    it('renders spinner with loading text', () => {
      // Arrange & Act
      render(<LoadingSkeleton />);

      // Assert
      expect(screen.getByRole('status', { name: /ładowanie/i })).toBeInTheDocument();
      expect(screen.getByText('Ładowanie...')).toBeInTheDocument();
    });

    it('applies correct spinner styling', () => {
      // Arrange & Act
      const { container } = render(<LoadingSkeleton variant="default" />);

      // Assert
      const spinner = container.querySelector('.animate-spin.border-t-primary');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('nav variant', () => {
    it('renders skeleton elements for navigation', () => {
      // Arrange & Act
      const { container } = render(<LoadingSkeleton variant="nav" />);

      // Assert
      const skeletonElements = container.querySelectorAll('.bg-gray-200.animate-pulse');
      expect(skeletonElements.length).toBeGreaterThan(0);
    });

    it('contains skeleton for user name and logout button', () => {
      // Arrange & Act
      const { container } = render(<LoadingSkeleton variant="nav" />);

      // Assert
      const userName = container.querySelector('.h-4.w-32');
      const logoutButton = container.querySelector('.h-10.w-24');
      expect(userName).toBeInTheDocument();
      expect(logoutButton).toBeInTheDocument();
    });
  });

  describe('profile variant', () => {
    it('renders skeleton elements for profile section', () => {
      // Arrange & Act
      const { container } = render(<LoadingSkeleton variant="profile" />);

      // Assert
      const skeletonElements = container.querySelectorAll('.bg-gray-200.animate-pulse');
      expect(skeletonElements).toHaveLength(3);
    });

    it('applies card styling', () => {
      // Arrange & Act
      const { container } = render(<LoadingSkeleton variant="profile" />);

      // Assert
      const card = container.querySelector('.bg-white.rounded-lg.shadow');
      expect(card).toBeInTheDocument();
    });
  });

  describe('detail variant', () => {
    it('renders skeleton for image, title, description and button', () => {
      // Arrange & Act
      const { container } = render(<LoadingSkeleton variant="detail" />);

      // Assert
      const imageSkeleton = container.querySelector('.aspect-video.bg-gray-200');
      expect(imageSkeleton).toBeInTheDocument();

      const skeletonElements = container.querySelectorAll('.bg-gray-200.animate-pulse');
      expect(skeletonElements.length).toBeGreaterThan(5);
    });
  });

  describe('custom height and className', () => {
    it('applies custom height when provided', () => {
      // Arrange
      const customHeight = 'h-20';

      // Act
      const { container } = render(<LoadingSkeleton height={customHeight} />);

      // Assert
      const skeleton = container.querySelector(`.${customHeight}`);
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('bg-gray-200', 'rounded', 'animate-pulse');
    });

    it('applies custom className when provided', () => {
      // Arrange
      const customClass = 'custom-test-class';

      // Act
      const { container } = render(<LoadingSkeleton className={customClass} />);

      // Assert
      const skeleton = container.querySelector(`.${customClass}`);
      expect(skeleton).toBeInTheDocument();
    });

    it('combines height and className', () => {
      // Arrange
      const customHeight = 'h-10';
      const customClass = 'w-full';

      // Act
      const { container } = render(<LoadingSkeleton height={customHeight} className={customClass} />);

      // Assert
      const skeleton = container.querySelector(`.${customHeight}.${customClass}`);
      expect(skeleton).toBeInTheDocument();
    });

    it('renders simple skeleton when height or className is provided', () => {
      // Arrange & Act
      render(<LoadingSkeleton height="h-10" />);

      // Assert - nie powinno być spinnera gdy jest custom height
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.queryByText('Ładowanie...')).not.toBeInTheDocument();
    });
  });
});
