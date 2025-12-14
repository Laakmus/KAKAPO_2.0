import { render, screen } from '@testing-library/react';
import { MainContentContainer } from '@/components/MainContentContainer';

const mocks = vi.hoisted(() => ({
  LoadingSkeleton: vi.fn(),
}));

vi.mock('@/components/LoadingSkeleton', () => ({
  LoadingSkeleton: (props: unknown) => {
    mocks.LoadingSkeleton(props);
    return <div data-testid="LoadingSkeleton" />;
  },
}));

describe('MainContentContainer', () => {
  it('renders children inside main landmark by default', () => {
    render(
      <MainContentContainer>
        <div>Treść</div>
      </MainContentContainer>,
    );

    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
    expect(screen.getByText('Treść')).toBeInTheDocument();
    expect(screen.queryByTestId('LoadingSkeleton')).not.toBeInTheDocument();
  });

  it('renders LoadingSkeleton when isLoading=true', () => {
    render(
      <MainContentContainer isLoading>
        <div>Treść</div>
      </MainContentContainer>,
    );

    expect(screen.getByTestId('LoadingSkeleton')).toBeInTheDocument();
    expect(screen.queryByText('Treść')).not.toBeInTheDocument();
  });
});
