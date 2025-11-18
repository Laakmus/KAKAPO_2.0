import { z } from 'zod';

/**
 * Schema walidacji dla endpointa POST /auth/login
 *
 * Wymagania:
 * - email: poprawny format email, konwersja na lowercase, trim
 * - password: minimum 6 znaków (zgodnie z Supabase Auth minimum)
 */
export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email jest wymagany' })
    .min(1, 'Email jest wymagany')
    .email('Nieprawidłowy format adresu email')
    .toLowerCase()
    .trim(),
  password: z.string({ required_error: 'Hasło jest wymagane' }).min(6, 'Hasło musi mieć minimum 6 znaków'),
});

/**
 * TypeScript type inferred from loginSchema
 * Używane w API route dla type safety
 */
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Schema walidacji dla endpointa POST /auth/signup
 *
 * Wymagania:
 * - email: poprawny format email, konwersja na lowercase, trim
 * - password: minimum 8 znaków (zgodnie ze specyfikacją projektu)
 * - first_name, last_name: wymagane, 1-100 znaków
 */
export const signupSchema = z.object({
  email: z
    .string({ required_error: 'Email jest wymagany' })
    .min(1, 'Email jest wymagany')
    .email('Nieprawidłowy format adresu email')
    .toLowerCase()
    .trim(),
  password: z.string({ required_error: 'Hasło jest wymagane' }).min(8, 'Hasło musi mieć minimum 8 znaków'),
  first_name: z
    .string({ required_error: 'Imię jest wymagane' })
    .min(1, 'Imię jest wymagane')
    .max(100, 'Imię może mieć maksymalnie 100 znaków')
    .trim(),
  last_name: z
    .string({ required_error: 'Nazwisko jest wymagane' })
    .min(1, 'Nazwisko jest wymagane')
    .max(100, 'Nazwisko może mieć maksymalnie 100 znaków')
    .trim(),
});

export type SignupInput = z.infer<typeof signupSchema>;
