import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OfferEditForm } from '@/components/OfferEditForm';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  onSubmit: vi.fn<[payload: unknown], Promise<void>>(),
  onCancel: vi.fn(),
  supabaseClient: {
    auth: {
      setSession: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: mocks.useAuth,
}));

vi.mock('@/db/supabase.client', () => ({
  supabaseClient: mocks.supabaseClient,
}));

describe('OfferEditForm', () => {
  beforeEach(() => {
    mocks.useAuth.mockReset();
    mocks.onSubmit.mockReset();
    mocks.onCancel.mockReset();

    mocks.useAuth.mockReturnValue({
      user: { id: 'u1' },
      token: 't',
    });

    // Keep image-loading branch active (so ImageUpload is not rendered)
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );
  });

  afterEach(() => {
    // restore any stubbed globals
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (vi as any).unstubAllGlobals?.();
  });

  it('renders with default values and calls onCancel when cancelling', async () => {
    const user = userEvent.setup();

    render(
      <OfferEditForm
        offer={
          {
            id: 'o1',
            title: 'Stary tytuł',
            description: 'To jest opis oferty (wystarczająco długi).',
            image_url: null,
            city: 'Warszawa',
          } as any
        }
        onSubmit={mocks.onSubmit}
        onCancel={mocks.onCancel}
        isSubmitting={false}
      />,
    );

    expect((screen.getByLabelText('Tytuł') as HTMLInputElement).value).toBe('Stary tytuł');

    // submit disabled until dirty
    expect(screen.getByRole('button', { name: 'Zapisz zmiany' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Anuluj' }));
    expect(mocks.onCancel).toHaveBeenCalledTimes(1);
  });

  it('submits only changed fields (e.g. title)', async () => {
    const user = userEvent.setup();

    render(
      <OfferEditForm
        offer={
          {
            id: 'o1',
            title: 'Stary tytuł',
            description: 'To jest opis oferty (wystarczająco długi).',
            image_url: null,
            city: 'Warszawa',
          } as any
        }
        onSubmit={mocks.onSubmit}
        onCancel={mocks.onCancel}
        isSubmitting={false}
      />,
    );

    const titleInput = screen.getByLabelText('Tytuł') as HTMLInputElement;

    await user.clear(titleInput);
    await user.type(titleInput, 'Nowy tytuł');

    expect(screen.getByRole('button', { name: 'Zapisz zmiany' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Zapisz zmiany' }));

    expect(mocks.onSubmit).toHaveBeenCalledWith({ title: 'Nowy tytuł' });
  });
});
