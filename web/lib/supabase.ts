import { createSupabaseClient } from "@/utils/supabase/clients/component";
import { useMemo } from "react";

export function useSupabase() {
  return useMemo(() => createSupabaseClient(), []);
}
