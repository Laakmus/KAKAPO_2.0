import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OffersFilterPanel } from '@/components/OffersFilterPanel';
import type { HomeFilterState } from '@/types';

describe('OffersFilterPanel', () => {
  const baseValues: HomeFilterState = {
    city: undefined,
    sort: 'created_at',
    order: 'desc',
  };

  it('does not show "Wyczyść" when filters are default', () => {
    render(<OffersFilterPanel values={baseValues} onChange={vi.fn()} onRefresh={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Wyczyść' })).not.toBeInTheDocument();
  });

  it('calls onChange when city/sort/order changes', () => {
    const onChange = vi.fn();
    render(<OffersFilterPanel values={baseValues} onChange={onChange} onRefresh={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Miasto'), { target: { value: 'Warszawa' } });
    expect(onChange).toHaveBeenLastCalledWith({ ...baseValues, city: 'Warszawa' });

    fireEvent.change(screen.getByLabelText('Sortuj według'), { target: { value: 'title' } });
    expect(onChange).toHaveBeenLastCalledWith({ ...baseValues, sort: 'title' });

    fireEvent.change(screen.getByLabelText('Kolejność'), { target: { value: 'asc' } });
    expect(onChange).toHaveBeenLastCalledWith({ ...baseValues, order: 'asc' });
  });

  it('shows "Wyczyść" when any filter is active and resets to defaults', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const values: HomeFilterState = { city: 'Kraków', sort: 'title', order: 'asc' };

    render(<OffersFilterPanel values={values} onChange={onChange} onRefresh={vi.fn()} />);

    const clear = screen.getByRole('button', { name: 'Wyczyść' });
    await user.click(clear);

    expect(onChange).toHaveBeenCalledWith({
      city: undefined,
      sort: 'created_at',
      order: 'desc',
    });
  });

  it('calls onRefresh when clicking "Odśwież"', async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();

    render(<OffersFilterPanel values={baseValues} onChange={vi.fn()} onRefresh={onRefresh} />);
    await user.click(screen.getByRole('button', { name: 'Odśwież' }));

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('disables controls and shows loading label when isLoading is true', () => {
    render(<OffersFilterPanel values={baseValues} onChange={vi.fn()} onRefresh={vi.fn()} isLoading={true} />);

    expect(screen.getByLabelText('Miasto')).toBeDisabled();
    expect(screen.getByLabelText('Sortuj według')).toBeDisabled();
    expect(screen.getByLabelText('Kolejność')).toBeDisabled();

    const refresh = screen.getByRole('button', { name: 'Odświeżanie...' });
    expect(refresh).toBeDisabled();
  });
});
