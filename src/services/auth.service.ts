import type { SupabaseClient } from '@supabase/supabase-js';
import type { RegisterUserCommand } from '../types';

/**
 * AuthService
 *
 * Encapsuluje logikę rejestracji użytkownika (Supabase Auth).
 * Metoda `register` wykonuje wywołanie do Supabase i mapuje znane scenariusze błędów.
 */
export class AuthService {
  /**
   * Rejestruje nowego użytkownika w Supabase Auth.
   *
   * @param command - dane rejestracyjne
   * @param supabase - SupabaseClient dostępny z locals
   * @returns obiekt z utworzonym user i komunikatem
   * @throws Error z polem `status` dla mapowania w route
   */
  static async register(command: RegisterUserCommand, supabase: SupabaseClient) {
    const { email, password, first_name, last_name } = command;

    // Wywołanie Supabase signUp - umieszczamy imię/nazwisko w metadata (options.data)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name,
          last_name,
        },
      },
    });

    if (error) {
      const message = String(error.message ?? '');
      const status = (error.status as number) | 0;

      // Rozpoznawanie konfliktu email (mapujemy na 400 zgodnie ze spec)
      if (message.toLowerCase().includes('already') || message.toLowerCase().includes('user already')) {
        const err = new Error('EMAIL_EXISTS') as Error & { status: number; original: typeof error };
        err.status = 400;
        err.original = error;
        throw err;
      }

      // Słabe hasło / walidacja -> 422
      if (message.toLowerCase().includes('password') || status === 422) {
        const err = new Error('WEAK_PASSWORD') as Error & { status: number; original: typeof error };
        err.status = 422;
        err.original = error;
        throw err;
      }

      // Domyślny nieoczekiwany błąd Supabase
      const err = new Error('SUPABASE_ERROR') as Error & { status: number; original: typeof error };
      err.status = 500;
      err.original = error;
      throw err;
    }

    if (!data || !data.user) {
      const err = new Error('INVALID_SUPABASE_RESPONSE') as Error & { status: number };
      err.status = 500;
      throw err;
    }

    const userWithMeta = data.user as typeof data.user & {
      confirmed_at?: string | null;
      email_confirmed_at?: string | null;
    };

    return {
      user: {
        id: data.user.id,
        email: data.user.email ?? '',
        // Supabase może zwracać `confirmed_at` / `email_confirmed_at` nazwy różnie w zależności od wersji
        email_confirmed_at: userWithMeta.confirmed_at ?? userWithMeta.email_confirmed_at ?? null,
      },
      message: 'Sprawdź swoją skrzynkę email w celu weryfikacji',
    };
  }

  /**
   * revokeSession
   *
   * Próbuje unieważnić sesję użytkownika. Implementacja stara się wykonać operacje
   * zarówno dla stateful sessions przechowywanych w tabeli `sessions` (jeśli istnieje),
   * jak i dla scenariuszy, kiedy nie ma takiej tabeli — wówczas operacja jest
   * idempotentna i traktowana jako sukces (brak globalnego mechanizmu blacklisty).
   *
   * @param params.userId - id użytkownika (z tokenu)
   * @param params.sessionId - opcjonalne id konkretnej sesji
   * @param params.allDevices - jeśli true -> revoke dla wszystkich sesji użytkownika
   * @param supabase - SupabaseClient (z locals)
   *
   * Rzuca Error z polem `status` dla mapowania w route (np. 404, 501, 500).
   */
  static async revokeSession(
    params: { userId: string; sessionId?: string; allDevices?: boolean },
    supabase: SupabaseClient,
  ) {
    const { userId, sessionId, allDevices } = params;

    if (!supabase) {
      const err = new Error('SUPABASE_CLIENT_MISSING') as Error & { status: number };
      err.status = 500;
      throw err;
    }

    try {
      // Jeśli system wspiera "revoke all devices" - spróbuj usunąć wpisy z tabeli `sessions`
      if (allDevices) {
        const { error } = await supabase.from('sessions').delete().eq('user_id', userId);
        if (error) {
          // Jeśli tabela `sessions` nie istnieje lub operacja nie jest wspierana przez DB,
          // uznajemy to za brak wsparcia serwerowego dla tej funkcjonalności.
          const notImpl = new Error('NOT_IMPLEMENTED');
          (notImpl as any).status = 501;
          (notImpl as any).original = error;
          throw notImpl;
        }

        return;
      }

      // Jeśli podano konkretne sessionId - spróbuj znaleźć i usunąć
      if (sessionId) {
        const { data, error } = await supabase
          .from('sessions')
          .select('id, user_id')
          .eq('id', sessionId)
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle();

        if (error) {
          const err = new Error('SUPABASE_QUERY_ERROR');
          (err as any).status = 500;
          (err as any).original = error;
          throw err;
        }

        if (!data) {
          const notFound = new Error('SESSION_NOT_FOUND');
          (notFound as any).status = 404;
          throw notFound;
        }

        const { error: delErr } = await supabase.from('sessions').delete().eq('id', sessionId);
        if (delErr) {
          const err = new Error('SUPABASE_DELETE_ERROR');
          (err as any).status = 500;
          (err as any).original = delErr;
          throw err;
        }

        return;
      }

      // Fallback: spróbuj usunąć rekordy sesji powiązane z userId jeśli tabela istnieje.
      const { error: fallbackError } = await supabase.from('sessions').delete().eq('user_id', userId);
      if (fallbackError) {
        // Brak tabeli `sessions` lub inny problem -> nie ma globalnego revoke, traktujemy jako no-op
        return;
      }
    } catch (err) {
      throw err;
    }
  }
}

export default AuthService;
