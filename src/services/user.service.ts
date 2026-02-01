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
      // Pobierz dane użytkownika z widoku public.users
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('id, first_name, last_name')
        .eq('id', userId)
        .maybeSingle();

      if (userError) {
        throw userError;
      }

      if (!user) return null;

      // Policz aktywne oferty użytkownika
      const { count, error: countError } = await this.supabase
        .from('offers')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', userId)
        .eq('status', 'ACTIVE');

      if (countError) {
        throw countError;
      }

      return {
        id: user.id as string,
        first_name: (user.first_name ?? '') as string,
        last_name: (user.last_name ?? '') as string,
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
