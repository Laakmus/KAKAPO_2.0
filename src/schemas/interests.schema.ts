import { z } from 'zod';

/**
 * Schema dla endpointu POST /api/interests
 * - body: { offer_id: string (UUID) }
 */
export const createInterestSchema = z.object({
  offer_id: z.string().uuid({ message: 'offer_id musi być poprawnym UUID' }),
});

export type CreateInterestInput = z.infer<typeof createInterestSchema>;

/**
 * Query schema dla endpointu GET /api/interests/my
 * - status: optional enum('PROPOSED'|'ACCEPTED'|'REALIZED')
 */
export const myInterestsQuerySchema = z.object({
  status: z
    .enum(['PROPOSED', 'ACCEPTED', 'WAITING', 'REALIZED'])
    .optional()
    .describe('Status zainteresowania do filtrowania'),
});

export type MyInterestsQuery = z.infer<typeof myInterestsQuerySchema>;
