/// <reference types="vitest" />

const mocks = vi.hoisted(() => ({
  sendMessage: vi.fn(),
}));

vi.mock('@/services/chats.service', () => ({
  default: vi.fn().mockImplementation(() => ({
    sendMessage: mocks.sendMessage,
  })),
}));

describe('POST /api/chats/:chat_id/messages', () => {
  beforeEach(() => {
    mocks.sendMessage.mockReset();
  });

  it('returns 409 when chat is locked', async () => {
    const { POST } = await import('@/pages/api/chats/[chat_id]/messages.ts');
    mocks.sendMessage.mockRejectedValue(new Error('CHAT_LOCKED'));

    const chatId = '0b7e6f70-1e0f-4a0a-b6d1-4a3e31f6bbd1';

    const req = new Request(`http://localhost/api/chats/${chatId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: 'Hej' }),
    });

    const res = await POST({
      params: { chat_id: chatId },
      request: req,
      locals: {
        supabase: {},
        user: { id: 'u1' },
      },
    } as any);

    expect(res.status).toBe(409);

    const payload = await res.json();
    expect(payload?.error?.code).toBe('CHAT_LOCKED');
  });
});

export {};
