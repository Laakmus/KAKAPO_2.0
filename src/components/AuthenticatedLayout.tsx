import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { TopNavBar, type NavItem } from './TopNavBar';
import { MainContentContainer } from './MainContentContainer';
import { GlobalToastArea } from './GlobalToastArea';
import { SkipToContent } from './SkipToContent';
import { useAuthState } from '@/hooks/useAuthState';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useLogout } from '@/hooks/useLogout';

/**
 * Props dla AuthenticatedLayout
 */
export type AuthenticatedLayoutProps = {
  children: ReactNode;
  currentPath: string;
  initialToken?: string;
};

/**
 * Komponent AuthenticatedLayoutInner
 *
 * Wewnętrzny komponent layoutu - wymaga otoczenia przez providery.
 * Obsługuje:
 * - Weryfikację autoryzacji (useProtectedRoute)
 * - Wczytywanie profilu użytkownika (useAuthState)
 * - Wyświetlanie nawigacji (TopNavBar)
 * - Renderowanie zawartości (MainContentContainer)
 * - Obsługę wylogowania (useLogout)
 */
function AuthenticatedLayoutInner({ children, currentPath }: Omit<AuthenticatedLayoutProps, 'initialToken'>) {
  const auth = useAuthState();
  const protectedRoute = useProtectedRoute();
  const { logout, isLoggingOut } = useLogout();
  const { token } = useAuth();

  /**
   * Prosty wskaźnik "nowe"/"nieprzeczytane" dla linku "Moje Oferty".
d   * Bazuje na porównaniu interests_count z "ostatnio widzianą" liczbą zainteresowań per oferta.
   * (To jest czysto UI sygnał; łatwo podmienić na prawdziwe "unread" gdy API/schemat to wspiera.)
   */
  const [myOffersHasUpdates, setMyOffersHasUpdates] = useState(false);

  useEffect(() => {
    // Unikamy podwójnego fetchowania na /offers/my (ta strona i tak pobiera oferty).
    if (currentPath.startsWith('/offers/my')) return;
    if (!token) {
      setMyOffersHasUpdates(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    fetch('/api/offers/my?status=ACTIVE', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as { data?: Array<{ id: string; interests_count?: number }> };
      })
      .then((payload) => {
        if (cancelled) return;
        const offers = payload?.data ?? [];
        let seenMap: Record<string, number> = {};
        if (typeof window !== 'undefined') {
          try {
            const raw = window.localStorage.getItem('kakapo_seen_interests_count_by_offer_id');
            const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {};
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              seenMap = parsed;
            }
          } catch {
            seenMap = {};
          }
        }

        const hasNew = offers.some((o) => (o.interests_count ?? 0) > (seenMap[o.id] ?? 0));
        setMyOffersHasUpdates(hasNew);
      })
      .catch(() => {
        if (cancelled) return;
        setMyOffersHasUpdates(false);
      })
      .finally(() => {
        clearTimeout(timeoutId);
      });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [token, currentPath]);

  /**
   * Nawigacja - stała lista linków
   */
  const navItems: NavItem[] = useMemo(
    () => [
      { label: 'Home', href: '/offers', testId: 'nav-home', exact: false },
      {
        label: 'Moje Oferty',
        href: '/offers/my',
        testId: 'nav-my-offers',
        exact: false,
        showDot: myOffersHasUpdates,
      },
      { label: 'Profil', href: '/profile', testId: 'nav-profile', exact: true },
      { label: 'Chat', href: '/chats', testId: 'nav-chat', exact: false },
    ],
    [myOffersHasUpdates],
  );

  /**
   * User label - imię i nazwisko
   */
  const userLabel = useMemo(() => {
    if (!auth.user) return undefined;
    return `${auth.user.first_name} ${auth.user.last_name}`;
  }, [auth.user]);

  // Jeśli status to redirect, nie renderuj nic (nastąpi przekierowanie)
  if (protectedRoute.status === 'redirect') {
    return null;
  }

  // Jeśli trasa nie jest gotowa, pokaż loading z nawigacją (bez user label)
  if (!protectedRoute.isReady) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        {/* Nawigacja z skeleton dla user label */}
        <TopNavBar
          navItems={navItems}
          activePath={currentPath}
          onLogout={logout}
          userLabel={undefined}
          isLoggingOut={false}
        />
        <MainContentContainer isLoading={true}>
          <div />
        </MainContentContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Skip to content link */}
      <SkipToContent />

      {/* Nawigacja */}
      <TopNavBar
        navItems={navItems}
        activePath={currentPath}
        onLogout={logout}
        userLabel={userLabel}
        isLoggingOut={isLoggingOut}
      />

      {/* Zawartość */}
      <MainContentContainer isLoading={auth.isLoading}>{children}</MainContentContainer>

      {/* Toasty */}
      <GlobalToastArea />
    </div>
  );
}

/**
 * Komponent AuthenticatedLayout
 *
 * Główny shell aplikacji dla tras chronionych.
 * Zapewnia:
 * - Providery (AuthProvider, ToastProvider)
 * - Weryfikację autoryzacji
 * - Nawigację globalną
 * - Kontener dla zawartości
 * - Obszar komunikatów (toast)
 *
 * Używany jako wrapper dla wszystkich chronionych tras:
 * /offers/*, /profile, /chats/*, /users/*
 *
 * @param props - Props komponentu
 */
export function AuthenticatedLayout({ children, currentPath, initialToken }: AuthenticatedLayoutProps) {
  return (
    <AuthProvider initialToken={initialToken}>
      <ToastProvider>
        <AuthenticatedLayoutInner currentPath={currentPath}>{children}</AuthenticatedLayoutInner>
      </ToastProvider>
    </AuthProvider>
  );
}
