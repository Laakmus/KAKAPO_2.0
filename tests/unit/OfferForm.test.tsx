import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OfferForm } from '@/components/OfferForm';

const mocks = vi.hoisted(() => ({
  useCreateOffer: vi.fn(),
  createOffer: vi.fn(),
  useAuth: vi.fn(),
  hardNavigate: vi.fn(),
  CitySelect: vi.fn(),
  ImageUpload: vi.fn(),
}));

vi.mock('@/hooks/useCreateOffer', () => ({
  useCreateOffer: mocks.useCreateOffer,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: mocks.useAuth,
}));

vi.mock('@/utils/navigation', () => ({
  hardNavigate: mocks.hardNavigate,
}));

vi.mock('@/components/CitySelect', () => ({
  CitySelect: (props: {
    id?: string;
    value: string;
    onChange: (city: string) => void;
    error?: string;
    disabled?: boolean;
  }) => {
    mocks.CitySelect(props);

    return (
      <div>
        <div data-testid="CitySelect">{props.value}</div>
        {props.error ? <div role="alert">{props.error}</div> : null}
        <button type="button" onClick={() => props.onChange('Warszawa')}>
          set-city-warszawa
        </button>
      </div>
    );
  },
}));

vi.mock('@/components/ImageUpload', () => ({
  ImageUpload: (props: { userId: string; disabled?: boolean }) => {
    mocks.ImageUpload(props);
    return <div data-testid="ImageUpload">{props.userId}</div>;
  },
}));

describe('OfferForm', () => {
  beforeEach(() => {
    mocks.useCreateOffer.mockReset();
    mocks.createOffer.mockReset();
    mocks.useAuth.mockReset();
    mocks.hardNavigate.mockReset();
    mocks.CitySelect.mockReset();
    mocks.ImageUpload.mockReset();

    mocks.useAuth.mockReturnValue({
      user: { id: 'u1' },
    });

    mocks.useCreateOffer.mockReturnValue({
      isLoading: false,
      createOffer: mocks.createOffer,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls onError with validation summary when form is invalid (missing city)', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();

    render(<OfferForm onError={onError} />);

    await user.type(screen.getByLabelText(/tytuł oferty/i), 'Super rower');
    await user.type(screen.getByLabelText(/opis oferty/i), 'To jest długi opis oferty.');

    await user.click(screen.getByRole('button', { name: 'Dodaj ofertę' }));

    expect(onError).toHaveBeenCalledWith('Wypełnij poprawnie wszystkie wymagane pola formularza.');
    expect(screen.getByText('Nie można dodać oferty')).toBeInTheDocument();
  });

  it('creates offer and hard-navigates to details after 1500ms', async () => {
    const user = userEvent.setup();
    const realSetTimeout = globalThis.setTimeout;
    const setTimeoutSpy = vi
      .spyOn(globalThis, 'setTimeout')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockImplementation(((cb: any, delay?: number) => {
        if (delay === 1500 && typeof cb === 'function') {
          cb();
          return 0 as any;
        }
        return realSetTimeout(cb, delay as any) as any;
      }) as any);

    const onSuccess = vi.fn();

    mocks.createOffer.mockResolvedValueOnce({
      success: true,
      data: { id: 'o1' },
    });

    render(<OfferForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText(/tytuł oferty/i), 'Super rower');
    await user.type(screen.getByLabelText(/opis oferty/i), 'To jest długi opis oferty.');
    await user.click(screen.getByRole('button', { name: 'set-city-warszawa' }));

    await user.click(screen.getByRole('button', { name: 'Dodaj ofertę' }));

    expect(mocks.createOffer).toHaveBeenCalledWith({
      title: 'Super rower',
      description: 'To jest długi opis oferty.',
      image_url: undefined,
      city: 'Warszawa',
    });

    expect(onSuccess).toHaveBeenCalledWith({ id: 'o1' });

    await waitFor(() => {
      expect(mocks.hardNavigate).toHaveBeenCalledWith('/offers/o1');
    });

    setTimeoutSpy.mockRestore();
  });
});
