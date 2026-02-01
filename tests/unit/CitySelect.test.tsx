import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CitySelect } from '@/components/CitySelect';

describe('CitySelect', () => {
  it('shows placeholder when value is empty', () => {
    render(<CitySelect value="" onChange={vi.fn()} />);
    expect(screen.getByText('Wybierz miasto')).toBeInTheDocument();
  });

  it('calls onChange with selected city', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<CitySelect value="" onChange={onChange} />);

    const trigger = screen.getByRole('combobox');
    await user.click(trigger);

    await user.click(screen.getByText('Warszawa'));
    expect(onChange).toHaveBeenCalledWith('Warszawa');
  });

  it('renders error message and sets aria attributes', () => {
    render(<CitySelect value="" onChange={vi.fn()} error="Pole wymagane" id="my-city" />);

    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveAttribute('aria-invalid', 'true');
    expect(trigger).toHaveAttribute('aria-describedby', 'my-city-error');
    expect(screen.getByRole('alert')).toHaveTextContent('Pole wymagane');
  });

  it('disables control when disabled=true', () => {
    render(<CitySelect value="" onChange={vi.fn()} disabled={true} />);
    expect(screen.getByRole('combobox')).toBeDisabled();
  });
});
