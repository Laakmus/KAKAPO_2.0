/**
 * Status Enums - Re-exports from database types
 *
 * This file provides:
 * 1. Type aliases for enum types (for type annotations)
 * 2. Const objects for runtime usage (iteration, validation, comparisons)
 *
 * Usage:
 *   import { OfferStatus, InterestStatus, ChatStatus } from '@/db/enums';
 *
 *   // As type:
 *   const status: OfferStatus = OfferStatus.ACTIVE;
 *
 *   // In comparisons:
 *   if (offer.status === OfferStatus.ACTIVE) { ... }
 *
 *   // In Supabase queries:
 *   .eq('status', OfferStatus.ACTIVE)
 */

import type { Database } from './database.types';

// =============================================================================
// TYPE ALIASES (for type annotations)
// =============================================================================

/** Offer status: 'ACTIVE' | 'REMOVED' */
export type OfferStatus = Database['public']['Enums']['offer_status'];

/** Interest status: 'PROPOSED' | 'ACCEPTED' | 'REALIZED' */
export type InterestStatus = Database['public']['Enums']['interest_status'];

/** Chat status: 'ACTIVE' | 'ARCHIVED' */
export type ChatStatus = Database['public']['Enums']['chat_status'];

// =============================================================================
// CONST OBJECTS (for runtime usage)
// =============================================================================

/**
 * Offer status values
 * - ACTIVE: Offer is visible and available
 * - REMOVED: Offer is soft-deleted (not visible in listings)
 */
export const OfferStatus = {
  ACTIVE: 'ACTIVE',
  REMOVED: 'REMOVED',
} as const satisfies Record<string, OfferStatus>;

/**
 * Interest status values
 * - PROPOSED: Initial state when user expresses interest
 * - ACCEPTED: Mutual match detected (both users interested)
 * - REALIZED: User confirmed receipt of goods
 */
export const InterestStatus = {
  PROPOSED: 'PROPOSED',
  ACCEPTED: 'ACCEPTED',
  REALIZED: 'REALIZED',
} as const satisfies Record<string, InterestStatus>;

/**
 * Chat status values
 * - ACTIVE: Chat is open and active
 * - ARCHIVED: Chat is archived (closed)
 */
export const ChatStatus = {
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
} as const satisfies Record<string, ChatStatus>;

// =============================================================================
// HELPER ARRAYS (for dropdowns, validation, etc.)
// =============================================================================

/** All offer status values as array */
export const OFFER_STATUSES: OfferStatus[] = Object.values(OfferStatus);

/** All interest status values as array */
export const INTEREST_STATUSES: InterestStatus[] = Object.values(InterestStatus);

/** All chat status values as array */
export const CHAT_STATUSES: ChatStatus[] = Object.values(ChatStatus);
