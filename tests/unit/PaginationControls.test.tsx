import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaginationControls } from '@/components/PaginationControls';
import type { OffersPaginationMeta } from '@/types';

describe('PaginationControls', () => {
  const createPagination = (overrides: Partial<OffersPaginationMeta> = {}): OffersPaginationMeta => ({
    page: 1,
    limit: 15,
    total: 45,
    total_pages: 3,
    ...overrides,
  });

  it('renders page info', () => {
    render(<PaginationControls pagination={createPagination({ page: 2, total_pages: 5 })} onPageChange={vi.fn()} />);
    expect(screen.getByText('Strona 2 z 5')).toBeInTheDocument();
  });

  it('disables previous on first page and does not call onPageChange', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();

    render(
      <PaginationControls pagination={createPagination({ page: 1, total_pages: 3 })} onPageChange={onPageChange} />,
    );

    const prev = screen.getByRole('button', { name: 'Poprzednia strona' });
    expect(prev).toBeDisabled();

    await user.click(prev);
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('disables next on last page and does not call onPageChange', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();

    render(
      <PaginationControls pagination={createPagination({ page: 3, total_pages: 3 })} onPageChange={onPageChange} />,
    );

    const next = screen.getByRole('button', { name: 'Następna strona' });
    expect(next).toBeDisabled();

    await user.click(next);
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('calls onPageChange with previous/next page when enabled', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();

    render(
      <PaginationControls pagination={createPagination({ page: 2, total_pages: 3 })} onPageChange={onPageChange} />,
    );

    await user.click(screen.getByRole('button', { name: 'Poprzednia strona' }));
    expect(onPageChange).toHaveBeenCalledWith(1);

    await user.click(screen.getByRole('button', { name: 'Następna strona' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});
