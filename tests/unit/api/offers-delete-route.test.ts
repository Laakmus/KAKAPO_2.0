import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  removeOffer: vi.fn(),
}));

vi.mock('@/services/offer.service', () => ({
  OfferService: vi.fn().mockImplementation(() => ({
    removeOffer: mocks.removeOffer,
  })),
}));

describe('DELETE /api/offers/:offer_id', () => {
  beforeEach(() => {
    mocks.removeOffer.mockReset();
  });

  it('returns 204 and calls OfferService.removeOffer', async () => {
    const { DELETE } = await import('@/pages/api/offers/[offer_id].ts');
    const offerId = 'f1f577a8-db01-4c30-8bd4-2eeac6d24ce4';

    const res = await DELETE({
      params: { offer_id: offerId },
      locals: {
        supabase: {},
        user: { id: 'u1' },
      },
    } as any);

    expect(res.status).toBe(204);
    expect(mocks.removeOffer).toHaveBeenCalledWith('u1', offerId);
  });

  it('returns 401 when user is missing', async () => {
    const { DELETE } = await import('@/pages/api/offers/[offer_id].ts');
    const offerId = 'f1f577a8-db01-4c30-8bd4-2eeac6d24ce4';

    const res = await DELETE({
      params: { offer_id: offerId },
      locals: {
        supabase: {},
        user: undefined,
      },
    } as any);

    expect(res.status).toBe(401);
  });
});
