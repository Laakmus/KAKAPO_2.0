import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { offerEditFormSchema, type OfferEditFormValues, ALLOWED_CITIES } from '@/schemas/offers.schema';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ImageUpload, type OfferImage } from './ImageUpload';
import type { OfferListItemDTO, UpdateOfferCommand, OfferImageDTO } from '@/types';

/**
 * Props dla OfferEditForm
 */
type OfferEditFormProps = {
  offer: OfferListItemDTO;
  onSubmit: (payload: UpdateOfferCommand) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
};

/**
 * Formularz inline edycji oferty
 *
 * Funkcjonalności:
 * - Pola: title, description, image_url, city
 * - Walidacja zgodna z backendem (react-hook-form + zod)
 * - Submit -> PATCH /api/offers/:offer_id
 * - Cancel -> ukrywa formularz
 * - Walidacja obrazu (URL musi kończyć się .jpg, .jpeg, .png, .webp)
 */
export function OfferEditForm({ offer, onSubmit, onCancel, isSubmitting }: OfferEditFormProps) {
  const { user, token } = useAuth();
  const [uploadedImages, setUploadedImages] = useState<OfferImage[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isLoadingImages, setIsLoadingImages] = useState(true);
  const [imagesChanged, setImagesChanged] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<OfferEditFormValues>({
    resolver: zodResolver(offerEditFormSchema),
    defaultValues: {
      title: offer.title,
      description: offer.description,
      image_url: offer.image_url || '',
      city: offer.city as (typeof ALLOWED_CITIES)[number],
    },
  });

  const selectedCity = watch('city');

  // Załaduj istniejące zdjęcia oferty
  useEffect(() => {
    const loadExistingImages = async () => {
      try {
        const response = await fetch(`/api/offers/${offer.id}/images`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const result = await response.json();
          const images: OfferImageDTO[] = result.data || [];

          // Konwertuj na format OfferImage
          const existingImages: OfferImage[] = images.map((img) => ({
            url: img.image_url,
            thumbnailUrl: img.thumbnail_url || undefined,
            path: '', // Nie znamy ścieżki dla istniejących zdjęć
            order: img.order_index,
          }));

          setUploadedImages(existingImages);
        } else if (offer.image_url) {
          // Fallback - użyj głównego zdjęcia oferty
          setUploadedImages([
            {
              url: offer.image_url,
              thumbnailUrl: undefined,
              path: '',
              order: 0,
            },
          ]);
        }
      } catch (err) {
        console.error('[OfferEditForm] Error loading images:', err);
        // Fallback - użyj głównego zdjęcia oferty
        if (offer.image_url) {
          setUploadedImages([
            {
              url: offer.image_url,
              thumbnailUrl: undefined,
              path: '',
              order: 0,
            },
          ]);
        }
      } finally {
        setIsLoadingImages(false);
      }
    };

    loadExistingImages();
  }, [offer.id, offer.image_url, token]);

  const handleImagesChange = (images: OfferImage[]) => {
    setUploadedImages(images);
    setUploadError(null);
    setImagesChanged(true);
  };

  const handleImageError = (error: string) => {
    setUploadError(error);
  };

  const handleFormSubmit = async (data: OfferEditFormValues) => {
    // Przygotuj payload - tylko zmienione pola
    const payload: UpdateOfferCommand = {};

    if (data.title && data.title !== offer.title) {
      payload.title = data.title;
    }
    if (data.description && data.description !== offer.description) {
      payload.description = data.description;
    }

    // Główne zdjęcie to pierwsze zdjęcie (order = 0)
    const mainImage = uploadedImages.find((img) => img.order === 0) || uploadedImages[0];
    const newMainImageUrl = mainImage?.url || null;

    if (newMainImageUrl !== offer.image_url) {
      payload.image_url = newMainImageUrl;
    }
    if (data.city && data.city !== offer.city) {
      payload.city = data.city;
    }

    // Jeśli nic się nie zmieniło i zdjęcia też nie, anuluj
    if (Object.keys(payload).length === 0 && !imagesChanged) {
      onCancel();
      return;
    }

    // Zaktualizuj ofertę
    await onSubmit(payload);

    // Jeśli zdjęcia się zmieniły, zaktualizuj je przez API
    if (imagesChanged && uploadedImages.length > 0) {
      try {
        // Najpierw pobierz istniejące zdjęcia aby je usunąć
        const existingResponse = await fetch(`/api/offers/${offer.id}/images`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (existingResponse.ok) {
          const existingData = await existingResponse.json();
          const existingImages: OfferImageDTO[] = existingData.data || [];

          // Usuń wszystkie istniejące zdjęcia
          for (const img of existingImages) {
            await fetch(`/api/offers/${offer.id}/images/${img.id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
          }
        }

        // Dodaj nowe zdjęcia
        await fetch(`/api/offers/${offer.id}/images`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            images: uploadedImages.map((img, idx) => ({
              image_url: img.url,
              thumbnail_url: img.thumbnailUrl || null,
              order_index: idx,
            })),
          }),
        });
      } catch (err) {
        console.error('[OfferEditForm] Error updating images:', err);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 mt-4 p-4 bg-muted rounded-md">
      {/* Title */}
      <div>
        <Label htmlFor="title">Tytuł</Label>
        <Input id="title" {...register('title')} placeholder="Tytuł oferty" disabled={isSubmitting} />
        {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Opis</Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="Opisz swoją ofertę..."
          rows={4}
          disabled={isSubmitting}
        />
        {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
      </div>

      {/* Image Upload (wiele zdjęć) */}
      <div>
        {isLoadingImages ? (
          <div className="p-4 bg-muted rounded-md">
            <p className="text-sm text-muted-foreground">Ładowanie zdjęć...</p>
          </div>
        ) : (
          <ImageUpload
            onImagesChange={handleImagesChange}
            onUploadError={handleImageError}
            currentImages={uploadedImages}
            userId={user?.id || ''}
            maxImages={5}
            disabled={isSubmitting}
          />
        )}
        {uploadError && <p className="text-sm text-destructive mt-1">{uploadError}</p>}
      </div>

      {/* City */}
      <div>
        <Label htmlFor="city">Miasto</Label>
        <Select
          value={selectedCity || ''}
          onValueChange={(value) => setValue('city', value as (typeof ALLOWED_CITIES)[number], { shouldDirty: true })}
          disabled={isSubmitting}
        >
          <SelectTrigger id="city">
            <SelectValue placeholder="Wybierz miasto" />
          </SelectTrigger>
          <SelectContent>
            {ALLOWED_CITIES.map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.city && <p className="text-sm text-destructive mt-1">{errors.city.message}</p>}
      </div>

      {/* Akcje */}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Anuluj
        </Button>
        <Button type="submit" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? 'Zapisywanie...' : 'Zapisz zmiany'}
        </Button>
      </div>

      {/* Wskaźnik edycji */}
      {isDirty && !isSubmitting && <p className="text-xs text-muted-foreground text-center">Masz niezapisane zmiany</p>}
    </form>
  );
}
