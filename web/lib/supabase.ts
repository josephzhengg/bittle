import { createSupabaseComponentClient } from '@/utils/supabase/clients/component';
import { useMemo } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function useSupabase() {
  return useMemo(() => createSupabaseComponentClient(), []);
}

export const createMiddlewareSupabaseClient = (): SupabaseClient => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
};
