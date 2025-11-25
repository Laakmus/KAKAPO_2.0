import { z } from 'zod';

export const userIdParamSchema = z.object({
  user_id: z.string({ required_error: 'ID użytkownika jest wymagane' }).uuid('Nieprawidłowy format ID użytkownika'),
});

export type UserIdParam = z.infer<typeof userIdParamSchema>;
