import { fireEvent, render, screen } from '@testing-library/react';
import { ImagePlaceholder, OfferImage } from '@/components/ImagePlaceholder';

describe('ImagePlaceholder', () => {
  describe('rendering', () => {
    it('renders with "Brak zdjęcia" text', () => {
      // Arrange & Act
      render(<ImagePlaceholder />);

      // Assert
      expect(screen.getByText('Brak zdjęcia')).toBeInTheDocument();
    });

    it('has correct aria-label', () => {
      // Arrange & Act
      render(<ImagePlaceholder />);

      // Assert
      const placeholder = screen.getByRole('img', { name: 'Brak zdjęcia' });
      expect(placeholder).toBeInTheDocument();
    });

    it('displays SVG icon', () => {
      // Arrange & Act
      const { container } = render(<ImagePlaceholder />);

      // Assert
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('text-gray-400');
    });

    it('applies default styling', () => {
      // Arrange & Act
      const { container } = render(<ImagePlaceholder />);

      // Assert
      const placeholder = container.querySelector('.bg-gray-200.text-gray-500');
      expect(placeholder).toBeInTheDocument();
    });
  });

  describe('custom className', () => {
    it('applies custom className', () => {
      // Arrange
      const customClass = 'w-64 h-64';

      // Act
      const { container } = render(<ImagePlaceholder className={customClass} />);

      // Assert
      const placeholder = container.querySelector('.w-64.h-64');
      expect(placeholder).toBeInTheDocument();
    });

    it('combines custom className with default styles', () => {
      // Arrange
      const customClass = 'rounded-lg';

      // Act
      const { container } = render(<ImagePlaceholder className={customClass} />);

      // Assert
      const placeholder = container.querySelector('.bg-gray-200.text-gray-500.rounded-lg');
      expect(placeholder).toBeInTheDocument();
    });
  });
});

describe('OfferImage', () => {
  describe('with valid image URL', () => {
    it('renders image with correct src', () => {
      // Arrange
      const imageUrl = 'https://example.com/image.jpg';
      const altText = 'Test offer image';

      // Act
      render(<OfferImage imageUrl={imageUrl} alt={altText} />);

      // Assert
      const img = screen.getByRole('img', { name: altText });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', imageUrl);
      expect(img).toHaveAttribute('alt', altText);
    });

    it('applies object-cover class', () => {
      // Arrange
      const imageUrl = 'https://example.com/image.jpg';

      // Act
      render(<OfferImage imageUrl={imageUrl} alt="Test" />);

      // Assert
      const img = screen.getByRole('img');
      expect(img).toHaveClass('object-cover');
    });

    it('applies custom className', () => {
      // Arrange
      const imageUrl = 'https://example.com/image.jpg';
      const customClass = 'w-full h-48';

      // Act
      render(<OfferImage imageUrl={imageUrl} alt="Test" className={customClass} />);

      // Assert
      const img = screen.getByRole('img');
      expect(img).toHaveClass('object-cover', 'w-full', 'h-48');
    });

    it('has loading="lazy" attribute', () => {
      // Arrange
      const imageUrl = 'https://example.com/image.jpg';

      // Act
      render(<OfferImage imageUrl={imageUrl} alt="Test" />);

      // Assert
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('loading', 'lazy');
    });
  });

  describe('with thumbnail URL', () => {
    it('uses thumbnail when useThumbnail is true', () => {
      // Arrange
      const imageUrl = 'https://example.com/image-full.jpg';
      const thumbnailUrl = 'https://example.com/image-thumb.jpg';

      // Act
      render(<OfferImage imageUrl={imageUrl} thumbnailUrl={thumbnailUrl} alt="Test" useThumbnail={true} />);

      // Assert
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', thumbnailUrl);
    });

    it('uses full image when useThumbnail is false', () => {
      // Arrange
      const imageUrl = 'https://example.com/image-full.jpg';
      const thumbnailUrl = 'https://example.com/image-thumb.jpg';

      // Act
      render(<OfferImage imageUrl={imageUrl} thumbnailUrl={thumbnailUrl} alt="Test" useThumbnail={false} />);

      // Assert
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', imageUrl);
    });

    it('falls back to full image when thumbnail is null', () => {
      // Arrange
      const imageUrl = 'https://example.com/image-full.jpg';

      // Act
      render(<OfferImage imageUrl={imageUrl} thumbnailUrl={null} alt="Test" useThumbnail={true} />);

      // Assert
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', imageUrl);
    });
  });

  describe('fallback to placeholder', () => {
    it('shows placeholder when imageUrl is null', () => {
      // Arrange & Act
      render(<OfferImage imageUrl={null} alt="Test" />);

      // Assert
      expect(screen.getByText('Brak zdjęcia')).toBeInTheDocument();
      expect(screen.queryByRole('img', { name: 'Test' })).not.toBeInTheDocument();
    });

    it('shows placeholder when imageUrl is undefined', () => {
      // Arrange & Act
      render(<OfferImage imageUrl={undefined} alt="Test" />);

      // Assert
      expect(screen.getByText('Brak zdjęcia')).toBeInTheDocument();
    });

    it('shows placeholder when image fails to load', () => {
      // Arrange
      const imageUrl = 'https://example.com/invalid-image.jpg';

      // Act
      render(<OfferImage imageUrl={imageUrl} alt="Test" />);

      // Symuluj błąd ładowania obrazu (ustawi imageError=true)
      const img = screen.getByRole('img', { name: 'Test' });
      fireEvent.error(img);

      // Assert - placeholder powinien się pojawić po błędzie ładowania
      expect(screen.getByText('Brak zdjęcia')).toBeInTheDocument();
      expect(screen.queryByRole('img', { name: 'Test' })).not.toBeInTheDocument();
    });

    it('applies className to placeholder when image fails', () => {
      // Arrange
      const customClass = 'w-64 h-64';

      // Act
      const { container } = render(<OfferImage imageUrl={null} alt="Test" className={customClass} />);

      // Assert
      const placeholder = container.querySelector('.w-64.h-64');
      expect(placeholder).toBeInTheDocument();
    });
  });
});
