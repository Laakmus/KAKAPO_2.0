import { useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createOfferSchema } from '@/schemas/offers.schema';
import type { CreateOfferCommand, CreateOfferResponse, ApiErrorResponse } from '@/types';
import { useCreateOffer } from '@/hooks/useCreateOffer';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CitySelect, type CityName } from '@/components/CitySelect';
import { ImageUpload, type OfferImage } from '@/components/ImageUpload';

/**
 * Typ wartości formularza
 */
type OfferFormValues = {
  title: string;
  description: string;
  image_url?: string | null;
  city: CityName | '';
};

/**
 * Props dla komponentu OfferForm
 */
type OfferFormProps = {
  /**
   * Callback wywoływany po pomyślnym utworzeniu oferty
   */
  onSuccess?: (offer: CreateOfferResponse) => void;
  /**
   * Callback wywoływany przy błędzie
   */
  onError?: (error: ApiErrorResponse | string) => void;
};

/**
 * Komponent OfferForm
 *
 * Formularz tworzenia nowej oferty z walidacją Zod i react-hook-form.
 *
 * Funkcjonalności:
 * - Walidacja inline (onBlur) zgodna z createOfferSchema
 * - Pola: title (5-100), description (10-5000), image_url (opcjonalny URL), city (enum)
 * - Instrukcje walidacji (helper text) dla każdego pola
 * - Integracja z API przez useCreateOffer hook
 * - Mapowanie błędów API na pola formularza
 * - Auto-focus na pierwszym polu przy montowaniu
 * - Auto-focus na pierwszym błędnym polu po walidacji
 * - Wyłączanie formularza podczas loading
 * - Przekierowanie do /offers/{id} po sukcesie
 *
 * @param props - Props komponentu
 */
export function OfferForm({ onSuccess, onError }: OfferFormProps) {
  const { isLoading, createOffer } = useCreateOffer();
  const { user } = useAuth();

  // Stan dla uploadu zdjęć (wiele zdjęć)
  const [uploadedImages, setUploadedImages] = useState<OfferImage[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Stan dla błędu walidacji formularza
  const [formValidationError, setFormValidationError] = useState<string | null>(null);

  // Referencje do pól formularza (dla auto-focus)
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Konfiguracja react-hook-form z walidacją Zod
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<OfferFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createOfferSchema) as any,
    defaultValues: {
      title: '',
      description: '',
      image_url: '',
      city: '',
    },
    mode: 'onBlur', // Walidacja przy opuszczeniu pola
  });

  // Auto-focus na pole title po zamontowaniu komponentu
  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  // Auto-focus na pierwsze błędne pole po walidacji
  useEffect(() => {
    const firstErrorField = Object.keys(errors)[0] as keyof OfferFormValues | undefined;

    if (firstErrorField) {
      const refMap = {
        title: titleInputRef,
        description: descriptionTextareaRef,
        image_url: null, // ImageUpload nie ma prostego ref
        city: null, // CitySelect nie ma prostego ref
      };

      refMap[firstErrorField]?.current?.focus();
    }
  }, [errors]);

  // Wyczyść błąd walidacji formularza gdy błędy formularza się zmienią (użytkownik zaczął poprawiać)
  useEffect(() => {
    if (Object.keys(errors).length === 0 && formValidationError) {
      setFormValidationError(null);
    }
  }, [errors, formValidationError]);

  /**
   * Handler błędów walidacji formularza (wywoływany przez handleSubmit gdy walidacja nie przejdzie)
   */
  const onFormError = () => {
    // Pokaż komunikat o błędzie walidacji
    const errorMessages: string[] = [];
    if (errors.title) errorMessages.push(`Tytuł: ${errors.title.message}`);
    if (errors.description) errorMessages.push(`Opis: ${errors.description.message}`);
    if (errors.city) errorMessages.push(`Miasto: ${errors.city.message}`);
    if (errors.image_url) errorMessages.push(`Zdjęcie: ${errors.image_url.message}`);

    const errorMessage =
      errorMessages.length > 0
        ? `Formularz zawiera błędy: ${errorMessages.join(', ')}`
        : 'Wypełnij poprawnie wszystkie wymagane pola formularza.';

    setFormValidationError(errorMessage);

    // Wywołaj callback błędu z informacją o błędzie walidacji
    onError?.(errorMessage);
  };

  /**
   * Handler submitu formularza
   */
  const onSubmit = async (values: OfferFormValues) => {
    // Wyczyść błąd walidacji formularza
    setFormValidationError(null);

    // Przygotuj dane do wysłania (city musi być CityName, nie '')
    if (!values.city) {
      setError('city', {
        type: 'manual',
        message: 'Miasto jest wymagane',
      });
      setFormValidationError('Miasto jest wymagane. Wybierz miasto z listy.');
      onError?.('Miasto jest wymagane. Wybierz miasto z listy.');
      return;
    }

    // Główne zdjęcie to pierwsze zdjęcie (order = 0)
    const mainImage = uploadedImages.find((img) => img.order === 0) || uploadedImages[0];

    const payload: CreateOfferCommand = {
      title: values.title,
      description: values.description,
      image_url: mainImage?.url || undefined,
      city: values.city as CityName,
    };

    // Wywołaj API
    const result = await createOffer(payload);

    if (result.success) {
      const offerId = result.data.id;

      // Zapisz wszystkie zdjęcia do tabeli offer_images (jeśli są)
      if (uploadedImages.length > 0) {
        try {
          const response = await fetch(`/api/offers/${offerId}/images`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              images: uploadedImages.map((img, idx) => ({
                image_url: img.url,
                thumbnail_url: img.thumbnailUrl || null,
                order_index: idx,
              })),
            }),
          });

          if (!response.ok) {
            console.error('[OfferForm] Failed to save offer images:', await response.text());
          }
        } catch (err) {
          console.error('[OfferForm] Error saving offer images:', err);
        }
      }

      // Sukces - wywołaj callback
      onSuccess?.(result.data);

      // Przekieruj do szczegółów oferty po krótkiej zwłoce (czas na wyświetlenie powiadomienia)
      setTimeout(() => {
        window.location.href = `/offers/${offerId}`;
      }, 1500);
    } else {
      // Błąd - mapuj błędy API na pola formularza
      if (typeof result.error !== 'string') {
        const apiError = result.error;
        const errorMessage = apiError.error?.message || 'Wystąpił błąd podczas tworzenia oferty';
        const errorField = apiError.error?.details?.field;

        // Mapowanie błędów 400/422 na konkretne pola
        if (errorField === 'title') {
          setError('title', {
            type: 'server',
            message: errorMessage,
          });
        } else if (errorField === 'description') {
          setError('description', {
            type: 'server',
            message: errorMessage,
          });
        } else if (errorField === 'image_url') {
          setError('image_url', {
            type: 'server',
            message: errorMessage,
          });
        } else if (errorField === 'city') {
          setError('city', {
            type: 'server',
            message: errorMessage,
          });
        }
      }

      // Wywołaj callback błędu
      onError?.(result.error);
    }
  };

  // Połącz register z ref dla auto-focus
  const titleRegister = register('title');
  const descriptionRegister = register('description');

  // Handler dla uploadu zdjęć (wiele)
  const handleImagesChange = (images: OfferImage[]) => {
    setUploadedImages(images);
    setUploadError(null);
  };

  const handleImageError = (error: string) => {
    setUploadError(error);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, onFormError)} className="space-y-6" noValidate>
      {/* Komunikat o błędzie walidacji formularza */}
      {formValidationError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg" role="alert">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-800">Nie można dodać oferty</p>
              <p className="text-sm text-red-700 mt-1">{formValidationError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Pole: Tytuł */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm font-medium">
          Tytuł oferty <span className="text-red-500">*</span>
        </Label>
        <Input
          id="title"
          type="text"
          placeholder="Np. Laptop Dell w zamian za rower"
          disabled={isLoading || isSubmitting}
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? 'title-error' : 'title-hint'}
          {...titleRegister}
          ref={(e) => {
            titleRegister.ref(e);
            titleInputRef.current = e;
          }}
        />
        <p id="title-hint" className="text-xs text-gray-600">
          Tytuł musi mieć od 5 do 100 znaków
        </p>
        {errors.title && (
          <p id="title-error" className="text-sm text-red-600" role="alert">
            {errors.title.message}
          </p>
        )}
      </div>

      {/* Pole: Opis */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium">
          Opis oferty <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="description"
          placeholder="Opisz swoją ofertę: stan przedmiotu, powód wymiany, czego szukasz w zamian..."
          rows={6}
          disabled={isLoading || isSubmitting}
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? 'description-error' : 'description-hint'}
          {...descriptionRegister}
          ref={(e) => {
            descriptionRegister.ref(e);
            descriptionTextareaRef.current = e;
          }}
        />
        <p id="description-hint" className="text-xs text-gray-600">
          Opis musi mieć od 10 do 5000 znaków
        </p>
        {errors.description && (
          <p id="description-error" className="text-sm text-red-600" role="alert">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Pole: Upload zdjęć (do 5) */}
      <div className="space-y-2">
        {user?.id ? (
          <ImageUpload
            onImagesChange={handleImagesChange}
            onUploadError={handleImageError}
            currentImages={uploadedImages}
            userId={user.id}
            maxImages={5}
            disabled={isLoading || isSubmitting}
          />
        ) : (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">Ładowanie danych użytkownika...</p>
          </div>
        )}
        {uploadError && (
          <p className="text-sm text-red-600" role="alert">
            {uploadError}
          </p>
        )}
      </div>

      {/* Pole: Miasto */}
      <div className="space-y-2">
        <Label htmlFor="city" className="text-sm font-medium">
          Miasto <span className="text-red-500">*</span>
        </Label>
        <Controller
          name="city"
          control={control}
          render={({ field }) => (
            <CitySelect
              id="city"
              value={field.value || ''}
              onChange={field.onChange}
              error={errors.city?.message}
              disabled={isLoading || isSubmitting}
            />
          )}
        />
        <p id="city-hint" className="text-xs text-gray-600">
          Wybierz miasto, w którym znajduje się przedmiot
        </p>
      </div>

      {/* Przycisk submit */}
      <Button type="submit" className="w-full" disabled={isLoading || isSubmitting} size="lg">
        {isLoading || isSubmitting ? 'Dodawanie oferty...' : 'Dodaj ofertę'}
      </Button>
    </form>
  );
}
