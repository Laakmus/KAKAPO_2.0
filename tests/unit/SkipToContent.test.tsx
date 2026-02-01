import { render, screen } from '@testing-library/react';
import { SkipToContent } from '@/components/SkipToContent';

describe('SkipToContent', () => {
  it('renders a link to #main-content', () => {
    render(<SkipToContent />);

    const link = screen.getByRole('link', { name: 'Przejdź do treści' });
    expect(link).toHaveAttribute('href', '#main-content');
  });
});
