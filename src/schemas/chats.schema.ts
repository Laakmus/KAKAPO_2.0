import { z } from 'zod';

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
