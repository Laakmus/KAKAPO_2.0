import React, { useState, useCallback } from 'react';
import { supabaseClient } from '@/db/supabase.client';
import { useAuth } from '@/contexts/AuthContext';
import { uploadMultipleImages, validateImageFiles } from '@/utils/image';

export interface OfferImage {
  url: string;
  thumbnailUrl?: string;
  path: string;
  order: number;
}

interface ImageUploadProps {
  onImagesChange: (images: OfferImage[]) => void;
  onUploadError?: (error: string) => void;
  currentImages?: OfferImage[];
  userId: string;
  maxImages?: number;
  disabled?: boolean;
}

/**
 * Image upload component with support for multiple images (up to 5)
 */
export function ImageUpload({
  onImagesChange,
  onUploadError,
  currentImages = [],
  userId,
  maxImages = 5,
  disabled = false,
}: ImageUploadProps) {
  const { token } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<OfferImage[]>(currentImages);
  const [error, setError] = useState<string | null>(null);

  /**
   * Ustaw sesję na kliencie Supabase przed uploadem
   * Potrzebne do spełnienia polityk RLS dla Storage
   */
  const ensureAuthSession = useCallback(async () => {
    if (!token) {
      throw new Error('Brak tokenu autoryzacji. Zaloguj się ponownie.');
    }

    // Odczytaj refresh_token z localStorage
    const refreshToken = typeof window !== 'undefined' 
      ? localStorage.getItem('refresh_token') || '' 
      : '';

    // Ustaw sesję na kliencie Supabase
    const { error: sessionError } = await supabaseClient.auth.setSession({
      access_token: token,
      refresh_token: refreshToken,
    });

    if (sessionError) {
      console.error('[ImageUpload] Session error:', sessionError);
      throw new Error('Błąd autoryzacji. Zaloguj się ponownie.');
    }
  }, [token]);

  const handleFilesSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Reset previous errors
    setError(null);

    // Check if adding these files would exceed the limit
    const totalImages = images.length + files.length;
    if (totalImages > maxImages) {
      const errorMsg = `Można dodać maksymalnie ${maxImages} zdjęć. Obecnie masz ${images.length}, próbujesz dodać ${files.length}.`;
      setError(errorMsg);
      if (onUploadError) {
        onUploadError(errorMsg);
      }
      return;
    }

    // Validate files
    const validation = validateImageFiles(files, maxImages);
    if (!validation.valid) {
      setError(validation.error || 'Nieprawidłowe pliki');
      if (onUploadError) {
        onUploadError(validation.error || 'Nieprawidłowe pliki');
      }
      return;
    }

    // Upload files
    await handleUpload(files);
  };

  const handleUpload = async (files: File[]) => {
    setUploading(true);
    setError(null);

    try {
      // Upewnij się, że mamy aktywną sesję przed uploadem
      await ensureAuthSession();
      
      const results = await uploadMultipleImages(files, userId, supabaseClient);

      // Create new images with order indices
      const newImages: OfferImage[] = results.map((result, index) => ({
        url: result.url,
        thumbnailUrl: result.thumbnailUrl,
        path: result.path,
        order: images.length + index,
      }));

      const updatedImages = [...images, ...newImages];
      setImages(updatedImages);
      onImagesChange(updatedImages);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Błąd podczas uploadu zdjęć';
      setError(errorMessage);
      if (onUploadError) {
        onUploadError(errorMessage);
      }
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index).map((img, i) => ({
      ...img,
      order: i,
    }));

    setImages(updatedImages);
    onImagesChange(updatedImages);
    setError(null);
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    const updatedImages = [...images];
    const [movedImage] = updatedImages.splice(fromIndex, 1);
    updatedImages.splice(toIndex, 0, movedImage);

    // Update order indices
    const reorderedImages = updatedImages.map((img, i) => ({
      ...img,
      order: i,
    }));

    setImages(reorderedImages);
    onImagesChange(reorderedImages);
  };

  const canAddMore = images.length < maxImages;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Zdjęcia oferty (opcjonalne, maks. {maxImages})
        </label>
        <p className="mt-1 text-sm text-gray-500">
          JPG, PNG lub WebP. Maksymalny rozmiar każdego: 10 MB. Pierwsze zdjęcie będzie głównym.
        </p>
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {images.map((image, index) => (
            <div key={index} className="relative group">
              <img
                src={image.thumbnailUrl || image.url}
                alt={`Zdjęcie ${index + 1}`}
                className="h-32 w-full rounded-lg object-cover"
              />

              {/* Main badge */}
              {index === 0 && (
                <div className="absolute left-2 top-2 rounded bg-blue-500 px-2 py-1 text-xs font-semibold text-white">
                  Główne
                </div>
              )}

              {/* Remove button */}
              {!uploading && (
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="absolute right-2 top-2 rounded-full bg-red-500 p-1.5 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                  aria-label={`Usuń zdjęcie ${index + 1}`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}

              {/* Reorder buttons */}
              {!uploading && images.length > 1 && (
                <div className="absolute bottom-2 left-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => handleReorder(index, index - 1)}
                      className="rounded bg-gray-800/80 p-1 text-white hover:bg-gray-900"
                      aria-label="Przesuń w lewo"
                      title="Przesuń w lewo"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}
                  {index < images.length - 1 && (
                    <button
                      type="button"
                      onClick={() => handleReorder(index, index + 1)}
                      className="rounded bg-gray-800/80 p-1 text-white hover:bg-gray-900"
                      aria-label="Przesuń w prawo"
                      title="Przesuń w prawo"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </div>
              )}

              {/* Order number */}
              <div className="absolute bottom-2 right-2 rounded bg-gray-800/80 px-2 py-0.5 text-xs text-white">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Area */}
      {canAddMore && (
        <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 py-10">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="mt-4">
              <label
                htmlFor="image-upload"
                className="cursor-pointer rounded-md bg-white font-medium text-indigo-600 hover:text-indigo-500"
              >
                <span>Wybierz {images.length > 0 ? 'więcej' : ''} zdjęć</span>
                <input
                  id="image-upload"
                  name="image-upload"
                  type="file"
                  className="sr-only"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  multiple
                  onChange={handleFilesSelect}
                  disabled={disabled || uploading}
                />
              </label>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {images.length > 0
                ? `Możesz dodać jeszcze ${maxImages - images.length} zdjęć`
                : 'Możesz wybrać do 5 zdjęć jednocześnie'}
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {uploading && (
        <div className="flex items-center justify-center space-x-2 py-4">
          <svg
            className="h-5 w-5 animate-spin text-indigo-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-sm text-gray-600">Przetwarzanie zdjęć...</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Info about maximum */}
      {!canAddMore && (
        <div className="rounded-md bg-blue-50 p-4">
          <p className="text-sm text-blue-800">Osiągnięto maksymalną liczbę zdjęć ({maxImages}).</p>
        </div>
      )}
    </div>
  );
}
