import { render, waitFor } from '@testing-library/react';
import { ChatsPageLayout } from '@/components/ChatsPageLayout';

type AuthenticatedLayoutProps = {
  currentPath: string;
  initialToken?: string;
  children: React.ReactNode;
};

type ChatsViewPageProps = {
  initialChatId?: string;
};

const mocks = vi.hoisted(() => ({
  AuthenticatedLayout: vi.fn(),
  ChatsViewPage: vi.fn(),
}));

vi.mock('@/components/AuthenticatedLayout', () => ({
  AuthenticatedLayout: (props: AuthenticatedLayoutProps) => {
    mocks.AuthenticatedLayout(props);
    return <div data-testid="AuthenticatedLayout">{props.children}</div>;
  },
}));

vi.mock('@/components/ChatsViewPage', () => ({
  ChatsViewPage: (props: ChatsViewPageProps) => {
    mocks.ChatsViewPage(props);
    return <div data-testid="ChatsViewPage" />;
  },
}));

describe('ChatsPageLayout', () => {
  beforeEach(() => {
    mocks.AuthenticatedLayout.mockReset();
    mocks.ChatsViewPage.mockReset();
  });

  it('wraps ChatsViewPage in AuthenticatedLayout and passes currentPath/initialToken', () => {
    render(<ChatsPageLayout currentPath="/chats" initialToken="t" />);

    const props = mocks.AuthenticatedLayout.mock.calls[0]?.[0];
    expect(props.currentPath).toBe('/chats');
    expect(props.initialToken).toBe('t');
  });

  it('reads chat_id from URL and passes it to ChatsViewPage', async () => {
    window.history.pushState({}, '', '/chats?chat_id=chat-123');

    render(<ChatsPageLayout currentPath="/chats" initialToken="t" />);

    await waitFor(() => {
      const lastCall = mocks.ChatsViewPage.mock.calls.at(-1)?.[0];
      expect(lastCall?.initialChatId).toBe('chat-123');
    });
  });

  it('passes undefined initialChatId when there is no chat_id param', async () => {
    window.history.pushState({}, '', '/chats');

    render(<ChatsPageLayout currentPath="/chats" initialToken="t" />);

    await waitFor(() => {
      const lastCall = mocks.ChatsViewPage.mock.calls.at(-1)?.[0];
      expect(lastCall?.initialChatId).toBeUndefined();
    });
  });
});
