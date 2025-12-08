import React, { type ReactNode } from 'react';
import { LogOut } from 'lucide-react';

/**
 * Typ NavItem (LayoutNavItem)
 */
export type NavItem = {
  label: string;
  href: string;
  icon?: ReactNode;
  exact?: boolean;
  testId?: string;
};

/**
 * Props dla TopNavBar
 */
export type TopNavBarProps = {
  navItems: NavItem[];
  activePath: string;
  onLogout: () => Promise<void>;
  userLabel?: string;
  isLoggingOut?: boolean;
};

/**
 * Komponent TopNavBar
 *
 * Stały pasek nawigacji widoczny na wszystkich chronionych stronach.
 * Zawiera:
 * - Logo/nazwę aplikacji (link do /offers)
 * - Listę linków nawigacyjnych
 * - Nazwę użytkownika
 * - Przycisk wylogowania
 *
 * Kluczowe cechy:
 * - Wyróżnienie aktywnego linku (aria-current="page")
 * - Obsługa wylogowania z disabled state podczas ładowania
 * - Dostępność (role="navigation", focus-visible)
 *
 * @param props - Props komponentu
 */
export function TopNavBar({ navItems, activePath, onLogout, userLabel, isLoggingOut = false }: TopNavBarProps) {
  /**
   * Sprawdza czy link jest aktywny
   */
  const isActive = (item: NavItem): boolean => {
    if (item.exact) {
      return activePath === item.href;
    }
    return activePath.startsWith(item.href);
  };

  /**
   * Obsługa kliknięcia wylogowania
   */
  const handleLogout = async () => {
    if (isLoggingOut) return;
    await onLogout();
  };

  return (
    <nav role="navigation" aria-label="Główna nawigacja" className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo / Nazwa aplikacji */}
          <div className="flex items-center">
            <a
              href="/offers"
              aria-label="KAKAPO - powrót do strony głównej"
              className="text-2xl font-bold text-primary hover:text-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus-visible:ring-2 rounded px-1"
            >
              KAKAPO
            </a>
          </div>

          {/* Linki nawigacyjne */}
          <div className="flex items-center space-x-1">
            {navItems.map((item) => {
              const active = isActive(item);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  data-testid={item.testId}
                  aria-current={active ? 'page' : undefined}
                  className={`
                    px-4 py-2 rounded-md text-sm font-medium transition-colors
                    focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus-visible:ring-2
                    ${
                      active
                        ? 'text-primary bg-primary/5 font-semibold'
                        : 'text-gray-700 hover:text-primary hover:bg-gray-50'
                    }
                  `}
                >
                  {item.icon && (
                    <span className="mr-2" aria-hidden="true">
                      {item.icon}
                    </span>
                  )}
                  {item.label}
                </a>
              );
            })}
          </div>

          {/* User label + Logout button */}
          <div className="flex items-center space-x-4">
            {/* Nazwa użytkownika - pokazuj skeleton gdy brak userLabel i nie wylogowujemy */}
            {userLabel ? (
              <span className="text-sm text-gray-700 font-medium hidden sm:inline" aria-live="polite">
                {userLabel}
              </span>
            ) : !isLoggingOut ? (
              <div className="hidden sm:block">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" aria-label="Ładowanie profilu..." />
              </div>
            ) : null}

            {/* Przycisk wylogowania */}
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              data-testid="logout-button"
              aria-label="Wyloguj"
              className={`
                inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium
                transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus-visible:ring-2
                ${
                  isLoggingOut
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800'
                }
              `}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {isLoggingOut ? 'Wylogowywanie...' : 'Wyloguj'}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
