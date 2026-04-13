import { AuthenticatedLayout } from './AuthenticatedLayout';
import { ChatDetailsPage } from './ChatDetailsPage';

export type ChatDetailsPageLayoutProps = {
  currentPath: string;
  initialToken?: string;
  initialUser?: import('@/types').UserProfileDTO;
  chatId: string;
};

export function ChatDetailsPageLayout({ currentPath, initialToken, initialUser, chatId }: ChatDetailsPageLayoutProps) {
  return (
    <AuthenticatedLayout currentPath={currentPath} initialToken={initialToken} initialUser={initialUser}>
      <ChatDetailsPage chatId={chatId} />
    </AuthenticatedLayout>
  );
}
