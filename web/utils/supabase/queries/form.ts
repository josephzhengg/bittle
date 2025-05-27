import { SupabaseClient } from '@supabase/supabase-js';
import { Form } from '@/utils/supabase/models/form';
import { z } from 'zod';
import { Organization } from '../models/organization';

export const getForms = async (
  supabase: SupabaseClient,
  id: string
): Promise<z.infer<typeof Form>[]> => {
  // Fetch all forms from a organzation

  const { data: formData, error: formError } = await supabase
    .from("form")
    .select("*")
    .eq("author", id);

  if (formError || !formData) {
    throw new Error(
      `Error fetching the forms for organization: ${formError?.message}`
    );
  }
  console.log(formData);
  console.log(formError);
  return formData as z.infer<typeof Form>[];
};
