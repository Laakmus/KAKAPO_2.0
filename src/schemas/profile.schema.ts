import { z } from 'zod';

/**
 * Schema walidacji formularza edycji profilu
 */
export const profileEditFormSchema = z.object({
  first_name: z
    .string({ required_error: 'Imię jest wymagane' })
    .min(1, 'Imię jest wymagane')
    .max(100, 'Imię nie może przekraczać 100 znaków'),
  last_name: z
    .string({ required_error: 'Nazwisko jest wymagane' })
    .min(1, 'Nazwisko jest wymagane')
    .max(100, 'Nazwisko nie może przekraczać 100 znaków'),
});

export type ProfileEditFormValues = z.infer<typeof profileEditFormSchema>;

/**
 * Schema walidacji formularza usuwania konta
 */
export const deleteAccountFormSchema = z.object({
  password: z.string({ required_error: 'Hasło jest wymagane' }).min(8, 'Hasło musi mieć co najmniej 8 znaków'),
});

export type DeleteAccountFormValues = z.infer<typeof deleteAccountFormSchema>;
