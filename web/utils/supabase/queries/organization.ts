import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { Organization } from '../models/organization';

export const getOrganization = async (
  supabase: SupabaseClient,
  id: string
): Promise<z.infer<typeof Organization>> => {
  // Fetch singular (the user's) organization
  const { data: organizationData, error: organizationError } = await supabase
    .from('organization')
    .select('*')
    .eq('id', id)
    .single();

  if (organizationError || !organizationData) {
    throw new Error(
      `Error fetching the organization: ${organizationError?.message}`
    );
  }

  return organizationData as z.infer<typeof Organization>;
};
