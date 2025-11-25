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
    .url('Nieprawidłowy format URL')
    .max(2048, 'URL nie może przekraczać 2048 znaków')
    .nullable()
    .optional()
    .transform((val) => (val === '' ? null : val)),

  city: z.enum(ALLOWED_CITIES, {
    required_error: "Pole 'city' jest wymagane",
    invalid_type_error: 'Nieprawidłowa nazwa miasta. Miasto musi być jednym z 16 dostępnych miast',
  }),
});

export type CreateOfferInput = z.infer<typeof createOfferSchema>;

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
