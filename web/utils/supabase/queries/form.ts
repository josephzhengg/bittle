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
): Promise<z.infer<typeof Form>> => {
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

  return formData as z.infer<typeof Form>;
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

export const getFormTitle = async (
  supabase: SupabaseClient,
  code: string
): Promise<string> => {
  // Fetch the title of a form by its code

  const { data: formData, error: formError } = await supabase
    .from('form')
    .select('*')
    .eq('code', code)
    .single();

  if (formError || !formData || formData.length === 0) {
    throw new Error(
      `Error fetching the Title for a form: ${formError?.message}`
    );
  }
  return formData.title;
};

export const getFormIdByCode = async (
  supabase: SupabaseClient,
  formCode: string
): Promise<string> => {
  const { data: formData, error: formIdError } = await supabase
    .from('form')
    .select('id')
    .eq('code', formCode)
    .single();

  if (!formData || formIdError) {
    throw new Error(
      `Error fetching form ID from form code: ${formIdError.message}`
    );
  }

  return formData.id as string;
};

export const deleteForm = async (
  supabase: SupabaseClient,
  form_id: string
): Promise<void> => {
  const { error: deleteError } = await supabase
    .from('form')
    .delete()
    .eq('id', form_id);

  if (deleteError) {
    throw new Error(`Error deleting form: ${deleteError.message}`);
  }
};
