import { AuthenticatedLayout } from './AuthenticatedLayout';
import { ChatDetailsPage } from './ChatDetailsPage';

export type ChatDetailsPageLayoutProps = {
  currentPath: string;
  initialToken?: string;
  chatId: string;
};

export function ChatDetailsPageLayout({ currentPath, initialToken, chatId }: ChatDetailsPageLayoutProps) {
  return (
    <AuthenticatedLayout currentPath={currentPath} initialToken={initialToken}>
      <ChatDetailsPage chatId={chatId} />
    </AuthenticatedLayout>
  );
}
