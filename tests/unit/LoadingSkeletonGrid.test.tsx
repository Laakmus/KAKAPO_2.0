import { render } from '@testing-library/react';
import { LoadingSkeletonGrid } from '@/components/LoadingSkeletonGrid';

describe('LoadingSkeletonGrid', () => {
  it('renders 6 skeleton cards by default', () => {
    const { container } = render(<LoadingSkeletonGrid />);

    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(6);
  });

  it('renders custom count when provided', () => {
    const { container } = render(<LoadingSkeletonGrid count={3} />);

    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(3);
  });
});
