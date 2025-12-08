import { z } from 'zod';

/**
 * Schema walidujący parametr path: chat_id
 */
export const chatIdParamsSchema = z.object({
  chat_id: z.string().uuid({ message: 'chat_id musi być poprawnym UUID' }),
});

export type ChatIdParams = z.infer<typeof chatIdParamsSchema>;

/**
 * Query schema dla endpointu GET /api/chats
 * - status: optional enum('ACTIVE'|'ARCHIVED')
 * - limit: optional integer (1-100)
 * - offset: optional integer (>=0)
 */
export const listChatsQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional().describe('Status czatu do filtrowania'),
  limit: z.preprocess(
    (v) => (v === undefined ? undefined : Number(v)),
    z.number().int().positive().max(100).optional(),
  ),
  offset: z.preprocess((v) => (v === undefined ? undefined : Number(v)), z.number().int().min(0).optional()),
});

export type ListChatsQuery = z.infer<typeof listChatsQuerySchema>;

/**
 * Query schema dla endpointu GET /api/chats/:chat_id/messages
 * - page: number (default 1)
 * - limit: number (default 50, max 100)
 * - order: 'asc' | 'desc' (default 'asc')
 */
export const listMessagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1).describe('Numer strony (1-based)'),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100, 'Limit nie może przekraczać 100')
    .optional()
    .default(50)
    .describe('Liczba wiadomości na stronę (max 100)'),
  order: z.enum(['asc', 'desc']).optional().default('asc').describe('Kierunek sortowania (chronologicznie)'),
});

export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;

/**
 * Schema dla tworzenia wiadomości
 * POST /api/chats/:chat_id/messages
 */
export const createMessageSchema = z.object({
  body: z
    .string({
      required_error: "Pole 'body' jest wymagane",
      invalid_type_error: "Pole 'body' musi być tekstem",
    })
    .trim()
    .min(1, 'Wiadomość nie może być pusta')
    .max(2000, 'Wiadomość może mieć maksymalnie 2000 znaków'),
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;
