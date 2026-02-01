import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImageUpload, type OfferImage } from '@/components/ImageUpload';

const mocks = vi.hoisted(() => {
  const supabaseClient = {
    auth: {
      setSession: vi.fn(),
    },
  };

  return {
    supabaseClient,
    useAuth: vi.fn(),
    validateImageFiles: vi.fn(),
    uploadMultipleImages: vi.fn(),
  };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: mocks.useAuth,
}));

vi.mock('@/db/supabase.client', () => ({
  supabaseClient: mocks.supabaseClient,
}));

vi.mock('@/utils/image', () => ({
  validateImageFiles: mocks.validateImageFiles,
  uploadMultipleImages: mocks.uploadMultipleImages,
}));

describe('ImageUpload', () => {
  beforeEach(() => {
    mocks.useAuth.mockReturnValue({ token: 'access-token' });
    mocks.supabaseClient.auth.setSession.mockResolvedValue({ error: null });
    mocks.validateImageFiles.mockReset();
    mocks.uploadMultipleImages.mockReset();
    localStorage.setItem('refresh_token', 'refresh-token');
  });

  it('shows error when adding files would exceed maxImages and does not validate/upload', async () => {
    const user = userEvent.setup();
    const onImagesChange = vi.fn();
    const onUploadError = vi.fn();

    const currentImages: OfferImage[] = Array.from({ length: 4 }).map((_, i) => ({
      url: `https://example.com/${i}.jpg`,
      thumbnailUrl: `https://example.com/${i}.thumb.jpg`,
      path: `p/${i}`,
      order: i,
    }));

    const { container } = render(
      <ImageUpload
        userId="user-1"
        currentImages={currentImages}
        maxImages={5}
        onImagesChange={onImagesChange}
        onUploadError={onUploadError}
      />,
    );

    const input = container.querySelector('input#image-upload') as HTMLInputElement;
    expect(input).toBeTruthy();

    const f1 = new File(['a'], 'a.png', { type: 'image/png' });
    const f2 = new File(['b'], 'b.png', { type: 'image/png' });
    await user.upload(input, [f1, f2]);

    expect(onUploadError).toHaveBeenCalledWith('Można dodać maksymalnie 5 zdjęć. Obecnie masz 4, próbujesz dodać 2.');
    expect(screen.getByText(/maksymalnie 5 zdjęć/i)).toBeInTheDocument();
    expect(mocks.validateImageFiles).not.toHaveBeenCalled();
    expect(mocks.uploadMultipleImages).not.toHaveBeenCalled();
  });

  it('shows validation error when validateImageFiles returns invalid', async () => {
    const user = userEvent.setup();
    const onImagesChange = vi.fn();
    const onUploadError = vi.fn();

    mocks.validateImageFiles.mockReturnValue({ valid: false, error: 'Nieprawidłowe pliki' });

    const { container } = render(
      <ImageUpload userId="user-1" onImagesChange={onImagesChange} onUploadError={onUploadError} />,
    );

    const input = container.querySelector('input#image-upload') as HTMLInputElement;
    // Użyj typu z accept inputa, żeby userEvent.upload nie odfiltrował pliku
    await user.upload(input, new File(['x'], 'x.png', { type: 'image/png' }));

    await waitFor(() => {
      expect(onUploadError).toHaveBeenCalledWith('Nieprawidłowe pliki');
    });
    expect(screen.getByText('Nieprawidłowe pliki')).toBeInTheDocument();
    expect(mocks.supabaseClient.auth.setSession).not.toHaveBeenCalled();
    expect(mocks.uploadMultipleImages).not.toHaveBeenCalled();
  });

  it('uploads valid files, sets session, and calls onImagesChange with ordered images', async () => {
    const user = userEvent.setup();
    const onImagesChange = vi.fn();

    mocks.validateImageFiles.mockReturnValue({ valid: true });
    mocks.uploadMultipleImages.mockResolvedValue([
      { url: 'https://cdn/u1.jpg', thumbnailUrl: 'https://cdn/t1.jpg', path: 'p1' },
      { url: 'https://cdn/u2.jpg', thumbnailUrl: null, path: 'p2' },
    ]);

    const { container } = render(<ImageUpload userId="user-1" onImagesChange={onImagesChange} />);

    const input = container.querySelector('input#image-upload') as HTMLInputElement;
    await user.upload(input, [
      new File(['1'], '1.jpg', { type: 'image/jpeg' }),
      new File(['2'], '2.jpg', { type: 'image/jpeg' }),
    ]);

    expect(mocks.supabaseClient.auth.setSession).toHaveBeenCalledWith({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    });

    expect(mocks.uploadMultipleImages).toHaveBeenCalledWith(expect.any(Array), 'user-1', mocks.supabaseClient);

    // Grid should render uploaded images
    expect(await screen.findByAltText('Zdjęcie 1')).toBeInTheDocument();
    expect(await screen.findByText('Główne')).toBeInTheDocument();

    expect(onImagesChange).toHaveBeenCalledWith([
      { url: 'https://cdn/u1.jpg', thumbnailUrl: 'https://cdn/t1.jpg', path: 'p1', order: 0 },
      { url: 'https://cdn/u2.jpg', thumbnailUrl: null, path: 'p2', order: 1 },
    ]);
  });

  it('removes an image and reindexes order', async () => {
    const user = userEvent.setup();
    const onImagesChange = vi.fn();

    const currentImages: OfferImage[] = [
      { url: 'https://cdn/1.jpg', thumbnailUrl: 'https://cdn/1t.jpg', path: 'p1', order: 0 },
      { url: 'https://cdn/2.jpg', thumbnailUrl: 'https://cdn/2t.jpg', path: 'p2', order: 1 },
      { url: 'https://cdn/3.jpg', thumbnailUrl: 'https://cdn/3t.jpg', path: 'p3', order: 2 },
    ];

    render(<ImageUpload userId="user-1" currentImages={currentImages} onImagesChange={onImagesChange} />);

    await user.click(screen.getByRole('button', { name: 'Usuń zdjęcie 2' }));
    expect(onImagesChange).toHaveBeenCalledWith([
      { ...currentImages[0], order: 0 },
      { ...currentImages[2], order: 1 },
    ]);
  });

  it('reorders images and updates order indices', async () => {
    const user = userEvent.setup();
    const onImagesChange = vi.fn();

    const currentImages: OfferImage[] = [
      { url: 'https://cdn/1.jpg', thumbnailUrl: 'https://cdn/1t.jpg', path: 'p1', order: 0 },
      { url: 'https://cdn/2.jpg', thumbnailUrl: 'https://cdn/2t.jpg', path: 'p2', order: 1 },
      { url: 'https://cdn/3.jpg', thumbnailUrl: 'https://cdn/3t.jpg', path: 'p3', order: 2 },
    ];

    render(<ImageUpload userId="user-1" currentImages={currentImages} onImagesChange={onImagesChange} />);

    // Move first image right (swap 1<->2)
    await user.click(screen.getAllByLabelText('Przesuń w prawo')[0]);
    expect(onImagesChange).toHaveBeenCalledWith([
      { ...currentImages[1], order: 0 },
      { ...currentImages[0], order: 1 },
      { ...currentImages[2], order: 2 },
    ]);
  });
});
