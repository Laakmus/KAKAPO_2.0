import { useEffect, useState } from 'react';
import { AuthenticatedLayout } from './AuthenticatedLayout';
import { ChatsViewPage } from './ChatsViewPage';

/**
 * Props dla ChatsPageLayout
 */
export type ChatsPageLayoutProps = {
  currentPath: string;
  initialToken?: string;
};

/**
 * Layout dedykowany dla strony Czatów
 *
 * Łączy AuthenticatedLayout z ChatsViewPage w jednej React island,
 * aby zapewnić dostęp do AuthProvider i ToastProvider context.
 */
export function ChatsPageLayout({ currentPath, initialToken }: ChatsPageLayoutProps) {
  const [initialChatId, setInitialChatId] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Pobierz chat_id z URL po stronie klienta
    const urlParams = new URLSearchParams(window.location.search);
    const chatId = urlParams.get('chat_id') || undefined;
    setInitialChatId(chatId);
  }, []);

  return (
    <AuthenticatedLayout currentPath={currentPath} initialToken={initialToken}>
      <div className="h-[calc(100vh-10rem)]">
        <ChatsViewPage initialChatId={initialChatId} />
      </div>
    </AuthenticatedLayout>
  );
}
