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

/**
 * Schema walidacji formularza zmiany hasła
 */
export const changePasswordFormSchema = z
  .object({
    current_password: z
      .string({ required_error: 'Obecne hasło jest wymagane' })
      .min(8, 'Obecne hasło musi mieć co najmniej 8 znaków'),
    new_password: z
      .string({ required_error: 'Nowe hasło jest wymagane' })
      .min(8, 'Nowe hasło musi mieć co najmniej 8 znaków'),
    confirm_password: z
      .string({ required_error: 'Potwierdzenie hasła jest wymagane' })
      .min(8, 'Potwierdzenie hasła musi mieć co najmniej 8 znaków'),
  })
  .superRefine((data, ctx) => {
    if (data.new_password !== data.confirm_password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirm_password'],
        message: 'Hasła nie są zgodne',
      });
    }
    if (data.new_password === data.current_password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['new_password'],
        message: 'Nowe hasło musi różnić się od obecnego',
      });
    }
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;
