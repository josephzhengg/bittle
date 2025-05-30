import { SupabaseClient } from '@supabase/supabase-js';
import { Form } from '@/utils/supabase/models/form';
import { z } from 'zod';

export const getForms = async (
  supabase: SupabaseClient,
  id: string
): Promise<z.infer<typeof Form>[]> => {
  // Fetch all forms from a organization

  const { data: formData, error: formError } = await supabase
    .from('form')
    .select('*')
    .eq('author', id);

  if (formError || !formData) {
    throw new Error(
      `Error fetching the forms for organization: ${formError?.message}`
    );
  }
  return formData as z.infer<typeof Form>[];
};

export const createForm = async (
  supabase: SupabaseClient,
  id: string,
  code: string,
  description: string | undefined,
  deadline: Date | undefined,
  title: string
): Promise<z.infer<typeof Form>[]> => {
  // Posts a form
  const payload = {
    author: id,
    created_at: new Date(),
    deadline: deadline,
    code: code,
    description: description,
    title: title
  };

  const { data: formData, error: formError } = await supabase
    .from('form')
    .insert(payload)
    .select()
    .single();

  if (formError || !formData) {
    throw new Error(formError?.message);
  }

  return formData as z.infer<typeof Form>[];
};

export const getCodes = async (supabase: SupabaseClient): Promise<string[]> => {
  const { data: codeData, error: codeError } = await supabase
    .from('form')
    .select('code');

  if (codeError || !codeData) {
    throw new Error(`Error fetching codes: ${codeError?.message}`);
  }

  return codeData.map((item) => item.code);
};
