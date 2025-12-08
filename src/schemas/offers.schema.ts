import { z } from 'zod';

// Schema walidujący parametr path: offer_id
export const offerIdParamsSchema = z.object({
  offer_id: z.string().uuid({ message: 'offer_id musi być poprawnym UUID' }),
});

export type OfferIdParams = z.infer<typeof offerIdParamsSchema>;
/**
 * Walidacja parametru ścieżki `user_id` dla endpointu:
 * GET /api/users/{user_id}/offers
 */
export const userIdParamSchema = z.object({
  user_id: z.string().uuid({ message: 'Nieprawidłowy format ID użytkownika' }).describe('UUID użytkownika'),
});

export type UserIdParam = z.infer<typeof userIdParamSchema>;

/* ========================
  Schemas dla ofert
  ======================== */
export const ALLOWED_CITIES = [
  'Warszawa',
  'Kraków',
  'Wrocław',
  'Poznań',
  'Gdańsk',
  'Szczecin',
  'Łódź',
  'Lublin',
  'Białystok',
  'Olsztyn',
  'Rzeszów',
  'Opole',
  'Zielona Góra',
  'Gorzów Wielkopolski',
  'Kielce',
  'Katowice',
] as const;

/**
 * Schema query params dla endpointu GET /api/offers
 * - page: number (default 1)
 * - limit: number (default 15, max 50)
 * - city: optional string z listy ALLOWED_CITIES
 * - sort: 'created_at' | 'title' (default 'created_at')
 * - order: 'asc' | 'desc' (default 'desc')
 */
export const offersListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1).describe('Numer strony (1-based)'),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(50, 'Limit nie może przekraczać 50')
    .optional()
    .default(15)
    .describe('Liczba elementów na stronę (max 50)'),
  city: z
    .string()
    .optional()
    .refine((city) => !city || (ALLOWED_CITIES as readonly string[]).includes(city as string), {
      message: 'Nieprawidłowa nazwa miasta',
    })
    .describe('Filtrowanie po mieście'),
  sort: z.enum(['created_at', 'title']).optional().default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const createOfferSchema = z.object({
  title: z
    .string({
      required_error: "Pole 'title' jest wymagane",
      invalid_type_error: "Pole 'title' musi być tekstem",
    })
    .min(5, 'Tytuł musi mieć co najmniej 5 znaków')
    .max(100, 'Tytuł nie może przekraczać 100 znaków')
    .transform((s) => s.trim()),

  description: z
    .string({
      required_error: "Pole 'description' jest wymagane",
      invalid_type_error: "Pole 'description' musi być tekstem",
    })
    .min(10, 'Opis musi mieć co najmniej 10 znaków')
    .max(5000, 'Opis nie może przekraczać 5000 znaków')
    .transform((s) => s.trim()),

  image_url: z
    .string()
    .transform((val) => (val === '' ? null : val))
    .nullable()
    .optional()
    .refine(
      (val) => {
        if (!val) return true; // null/undefined is valid
        try {
          new URL(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: 'Nieprawidłowy format URL' },
    )
    .refine((val) => !val || val.length <= 2048, {
      message: 'URL nie może przekraczać 2048 znaków',
    }),

  city: z.enum(ALLOWED_CITIES, {
    required_error: "Pole 'city' jest wymagane",
    invalid_type_error: 'Nieprawidłowa nazwa miasta. Miasto musi być jednym z 16 dostępnych miast',
  }),
});

export type CreateOfferInput = z.infer<typeof createOfferSchema>;

/**
 * Schema dla aktualizacji oferty (PATCH /api/offers/{offer_id})
 * Wszystkie pola są opcjonalne, ale jeśli są podane, muszą spełniać te same warunki co przy tworzeniu
 */
export const updateOfferSchema = z.object({
  title: z
    .string()
    .min(5, 'Tytuł musi mieć co najmniej 5 znaków')
    .max(100, 'Tytuł nie może przekraczać 100 znaków')
    .transform((s) => s.trim())
    .optional(),

  description: z
    .string()
    .min(10, 'Opis musi mieć co najmniej 10 znaków')
    .max(5000, 'Opis nie może przekraczać 5000 znaków')
    .transform((s) => s.trim())
    .optional(),

  image_url: z
    .string()
    .transform((val) => (val === '' ? null : val))
    .refine(
      (val) => {
        if (!val) return true; // Null/empty is valid
        try {
          new URL(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: 'Nieprawidłowy format URL' },
    )
    .refine(
      (val) => {
        if (!val) return true; // Null/empty is valid
        return /\.(jpg|jpeg|png|webp)$/i.test(val);
      },
      { message: 'URL obrazu musi kończyć się na .jpg, .jpeg, .png lub .webp' },
    )
    .nullable()
    .optional(),

  city: z.enum(ALLOWED_CITIES).optional(),

  status: z.enum(['ACTIVE', 'REMOVED']).optional(),
});

export type UpdateOfferInput = z.infer<typeof updateOfferSchema>;

/**
 * Schema dla formularza edycji oferty (frontend)
 * Używany w komponentach React z react-hook-form
 * Wszystkie pola są wymagane w formularzu (mają wartości domyślne z oferty)
 */
export const offerEditFormSchema = z.object({
  title: z.string().min(5, 'Tytuł musi mieć co najmniej 5 znaków').max(100, 'Tytuł nie może przekraczać 100 znaków'),

  description: z
    .string()
    .min(10, 'Opis musi mieć co najmniej 10 znaków')
    .max(5000, 'Opis nie może przekraczać 5000 znaków'),

  image_url: z
    .string()
    .refine(
      (val) => {
        if (!val || val === '') return true; // Empty is valid
        try {
          new URL(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: 'Nieprawidłowy format URL' },
    )
    .refine(
      (val) => {
        if (!val || val === '') return true; // Empty is valid
        return /\.(jpg|jpeg|png|webp)$/i.test(val);
      },
      { message: 'URL obrazu musi kończyć się na .jpg, .jpeg, .png lub .webp' },
    )
    .optional(),

  city: z.enum(ALLOWED_CITIES),
});

/**
 * Typ dla formularza edycji oferty (inferowany ze schematu)
 */
export type OfferEditFormValues = z.infer<typeof offerEditFormSchema>;

/**
 * Typ dla miasta oferty (eksportowany do wielokrotnego użytku)
 */
export type OfferCity = (typeof ALLOWED_CITIES)[number];

// Schema dla endpointu GET /api/offers/my
export const myOffersQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'REMOVED']).optional().default('ACTIVE').describe('Status oferty do filtrowania'),
});

export type MyOffersQuery = z.infer<typeof myOffersQuerySchema>;

/**
 * Schema dla endpointu GET /api/offers/{offer_id}/interests
 * Waliduje parametr path `offer_id` oraz opcjonalne parametry paginacji i filtr statusu
 */
export const listInterestsSchema = z.object({
  offer_id: z.string().uuid({ message: 'Nieprawidłowy format ID oferty' }).describe('UUID oferty'),
  page: z.coerce.number().int().min(1).default(1).describe('Numer strony (1-based)'),
  limit: z.coerce.number().int().min(1).max(100).default(20).describe('Liczba elementów na stronę (max 100)'),
  status: z.enum(['PROPOSED', 'ACCEPTED', 'REALIZED']).optional().describe('Status zainteresowania do filtrowania'),
});

export type ListInterestsInput = z.infer<typeof listInterestsSchema>;

// ========================
// Schemas dla zarządzania zdjęciami ofert
// ========================

/**
 * Schema dla pojedynczego zdjęcia przy dodawaniu
 */
export const offerImageSchema = z.object({
  image_url: z.string().url('Nieprawidłowy format URL zdjęcia').max(2048, 'URL nie może przekraczać 2048 znaków'),
  thumbnail_url: z.string().url('Nieprawidłowy format URL miniatury').max(2048).nullable().optional(),
  order_index: z.number().int().min(0, 'Kolejność musi być liczbą nieujemną').max(4, 'Maksymalna kolejność to 4'),
});

/**
 * Schema dla dodawania zdjęć do oferty (POST /api/offers/:id/images)
 */
export const addOfferImagesSchema = z.object({
  images: z
    .array(offerImageSchema)
    .min(1, 'Musisz dodać przynajmniej 1 zdjęcie')
    .max(5, 'Można dodać maksymalnie 5 zdjęć'),
});

export type AddOfferImagesInput = z.infer<typeof addOfferImagesSchema>;

/**
 * Schema dla pojedynczego elementu przy zmianie kolejności
 */
export const reorderImageItemSchema = z.object({
  id: z.string().uuid('ID zdjęcia musi być poprawnym UUID'),
  order_index: z.number().int().min(0).max(4),
});

/**
 * Schema dla zmiany kolejności zdjęć (PUT /api/offers/:id/images/reorder)
 */
export const reorderImagesSchema = z.object({
  images: z.array(reorderImageItemSchema).min(1, 'Lista zdjęć nie może być pusta').max(5, 'Maksymalnie 5 zdjęć'),
});

export type ReorderImagesInput = z.infer<typeof reorderImagesSchema>;

/**
 * Schema dla parametru image_id w ścieżce
 */
export const imageIdParamsSchema = z.object({
  offer_id: z.string().uuid({ message: 'offer_id musi być poprawnym UUID' }),
  image_id: z.string().uuid({ message: 'image_id musi być poprawnym UUID' }),
});

export type ImageIdParams = z.infer<typeof imageIdParamsSchema>;
