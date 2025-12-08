import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { NotificationMessage } from '@/types';

/**
 * Rozszerzony typ NotificationMessage z dodatkowymi polami dla CTA
 */
export type ToastMessage = NotificationMessage & {
  id: string;
  actionLabel?: string;
  onAction?: () => void;
};

/**
 * Typ kontekstu Toast
 */
export type ToastContextValue = {
  messages: ToastMessage[];
  push: (msg: Omit<ToastMessage, 'id'>) => void;
  remove: (id: string) => void;
  clear: () => void;
};

/**
 * Kontekst Toast
 */
const ToastContext = createContext<ToastContextValue | undefined>(undefined);

/**
 * Props dla ToastProvider
 */
type ToastProviderProps = {
  children: ReactNode;
};

/**
 * Provider dla kontekstu Toast
 *
 * Zarządza kolejką komunikatów toast (powiadomień), umożliwiając:
 * - Dodawanie nowych komunikatów (push)
 * - Usuwanie pojedynczego komunikatu (remove)
 * - Czyszczenie wszystkich komunikatów (clear)
 *
 * Każdy toast otrzymuje unikalny ID przy dodaniu.
 */
export function ToastProvider({ children }: ToastProviderProps) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  /**
   * Dodaje nowy toast do kolejki
   */
  const push = useCallback((msg: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newMessage: ToastMessage = { ...msg, id };

    setMessages((prev) => [...prev, newMessage]);

    // Auto-dismiss po 5 sekundach dla success, 8 dla error
    const timeout = msg.type === 'success' ? 5000 : 8000;
    setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    }, timeout);
  }, []);

  /**
   * Usuwa toast o podanym ID
   */
  const remove = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  /**
   * Czyści wszystkie toasty
   */
  const clear = useCallback(() => {
    setMessages([]);
  }, []);

  const value: ToastContextValue = {
    messages,
    push,
    remove,
    clear,
  };

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

/**
 * Hook do używania kontekstu Toast
 *
 * @throws Error jeśli używany poza ToastProvider
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
