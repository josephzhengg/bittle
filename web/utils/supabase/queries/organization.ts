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

export const changeOrganizationName = async (
  supabase: SupabaseClient,
  newName: string,
  id: string
): Promise<void> => {
  const { error: updateError } = await supabase
    .from('organization')
    .update({ name: newName })
    .eq('id', id)
    .single();

  if (updateError) {
    throw new Error(`Error updating name: ${updateError?.message}`);
  }
};

export const changeAffiliation = async (
  supabase: SupabaseClient,
  newAffiliation: string,
  id: string
): Promise<void> => {
  const { error: updateError } = await supabase
    .from('organization')
    .update({ affiliation: newAffiliation })
    .eq('id', id)
    .single();

  if (updateError) {
    throw new Error(`Error updating affiliation: ${updateError?.message}`);
  }
};
