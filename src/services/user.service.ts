import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../db/database.types';
import type { PublicUserDTO, DeleteAccountCommand } from '../types';

export class UserService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Pobiera publiczny profil użytkownika oraz liczbę aktywnych ofert.
   * Zwraca `null` gdy użytkownik nie istnieje.
   */
  async getPublicProfile(userId: string): Promise<PublicUserDTO | null> {
    try {
      // Pobierz dane użytkownika z auth schema - supabase typings nie zawierają auth.users w domyślnym schemacie,
      // więc używamy string cast aby uniknąć problemów typów przy odczycie. Dane użytkownika (first_name/last_name)
      // są przechowywane w metadata auth.user albo w osobnej tabeli; tutaj próbujemy bezpiecznie pobrać z auth.users.
      const sb = this.supabase as unknown as {
        from: (relation: string) => {
          select: (cols: string) => unknown;
        };
      };

      const fromAuthUsers = sb.from('auth.users') as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: unknown) => { single: () => Promise<{ data: unknown; error: unknown }> };
        };
      };

      const res = await fromAuthUsers
        .select('id, user_metadata->>first_name as first_name, user_metadata->>last_name as last_name')
        .eq('id', userId)
        .single();
      const { data: user, error: userError } = res as { data: unknown; error: unknown };

      if (userError) {
        // Brak wiersza traktujemy jako not found
        if ((userError as unknown as { status?: number })?.status === 406) {
          return null;
        }
        throw userError;
      }

      if (!user) return null;
      const u = user as unknown as { id: string; first_name?: string; last_name?: string };

      // Policz aktywne oferty użytkownika (typy dla offers są dostępne)
      const { count, error: countError } = await this.supabase
        .from('offers')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', userId)
        .eq('status', 'ACTIVE');

      if (countError) {
        throw countError;
      }

      return {
        id: u.id,
        first_name: u.first_name ?? '',
        last_name: u.last_name ?? '',
        active_offers_count: count ?? 0,
      };
    } catch (error) {
      console.error('[UserService.getPublicProfile] Error:', error);
      throw error;
    }
  }

  /**
   * Usuń konto użytkownika (hard delete) przez RPC `admin_delete_user_account`.
   * Metoda statyczna używana przez `GET/DELETE /api/users/me` endpoint.
   */
  static async deleteUser(cmd: DeleteAccountCommand & { userId: string }, supabase: SupabaseClient<Database>) {
    const { userId } = cmd;

    if (!supabase) {
      const err = new Error('SUPABASE_CLIENT_MISSING');
      (err as unknown as { status?: number }).status = 500;
      throw err;
    }

    try {
      const { data, error } = await supabase.rpc('admin_delete_user_account', { target_user_id: userId });

      if (error) {
        const err = new Error('RPC_ERROR');
        (err as unknown as { status?: number }).status = 500;
        (err as unknown as { original?: unknown }).original = error;
        throw err;
      }

      if (!data || (data as unknown as { success?: boolean }).success === false) {
        const message = (data as unknown as { message?: string })?.message ?? 'Unable to delete user';
        const err = new Error('DELETE_FAILED');
        (err as unknown as { status?: number }).status = 500;
        (err as unknown as { details?: unknown }).details = message;
        throw err;
      }

      return data;
    } catch (err) {
      throw err;
    }
  }
}

export default UserService;
