import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OffersNewPage } from '@/components/OffersNewPage';
import type { ApiErrorResponse, CreateOfferResponse } from '@/types';

const mocks = vi.hoisted(() => ({
  OfferForm: vi.fn(),
}));

vi.mock('@/components/OfferForm', () => ({
  OfferForm: (props: {
    onSuccess: (o: CreateOfferResponse) => void;
    onError: (e: ApiErrorResponse | string) => void;
  }) => {
    mocks.OfferForm(props);

    return (
      <div>
        <button
          type="button"
          onClick={() =>
            props.onSuccess({
              id: 'o1',
              title: 'Oferta',
              description: 'Opis',
              image_url: null,
              city: 'Gdańsk',
              status: 'ACTIVE',
              created_at: new Date('2025-01-01').toISOString(),
              owner_id: 'u1',
              search_vector: null,
              interests_count: 0,
            })
          }
        >
          emit-success
        </button>
        <button type="button" onClick={() => props.onError('Coś poszło nie tak')}>
          emit-error-string
        </button>
        <button
          type="button"
          onClick={() =>
            props.onError({
              error: {
                code: 'BAD_REQUEST',
                message: 'Błąd ogólny',
              },
            })
          }
        >
          emit-error-api
        </button>
        <button
          type="button"
          onClick={() =>
            props.onError({
              error: {
                code: 'BAD_REQUEST',
                message: 'Błąd pola',
                details: { field: 'title' },
              },
            })
          }
        >
          emit-error-field
        </button>
      </div>
    );
  },
}));

describe('OffersNewPage', () => {
  it('renders header and OfferForm', () => {
    render(<OffersNewPage />);

    expect(screen.getByRole('heading', { name: 'Dodaj nową ofertę' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'emit-success' })).toBeInTheDocument();
  });

  it('shows success notification after OfferForm success', async () => {
    const user = userEvent.setup();

    render(<OffersNewPage />);

    await user.click(screen.getByRole('button', { name: 'emit-success' }));

    expect(
      await screen.findByText('Oferta dodana pomyślnie! Za chwilę zostaniesz przekierowany...'),
    ).toBeInTheDocument();
  });

  it('shows error notification for string error', async () => {
    const user = userEvent.setup();

    render(<OffersNewPage />);

    await user.click(screen.getByRole('button', { name: 'emit-error-string' }));

    expect(await screen.findByText('Coś poszło nie tak')).toBeInTheDocument();
  });

  it('shows error notification for API error without details.field', async () => {
    const user = userEvent.setup();

    render(<OffersNewPage />);

    await user.click(screen.getByRole('button', { name: 'emit-error-api' }));

    expect(await screen.findByText('Błąd ogólny')).toBeInTheDocument();
  });

  it('does not show notification for API field error (details.field present)', async () => {
    const user = userEvent.setup();

    render(<OffersNewPage />);

    await user.click(screen.getByRole('button', { name: 'emit-error-field' }));

    expect(screen.queryByText('Błąd pola')).not.toBeInTheDocument();
  });

  it('allows closing notification', async () => {
    const user = userEvent.setup();

    render(<OffersNewPage />);

    await user.click(screen.getByRole('button', { name: 'emit-success' }));
    expect(
      await screen.findByText('Oferta dodana pomyślnie! Za chwilę zostaniesz przekierowany...'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Zamknij powiadomienie' }));
    expect(
      screen.queryByText('Oferta dodana pomyślnie! Za chwilę zostaniesz przekierowany...'),
    ).not.toBeInTheDocument();
  });
});
