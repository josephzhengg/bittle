import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { FormSubmission } from '../models/form-submission';
import { QuestionResponse } from '../models/question-response';
import { ResponseOptionSelection } from '../models/response-option-selection';

export const getFormSubmissions = async (
  supabase: SupabaseClient,
  form_id: string
): Promise<z.infer<typeof FormSubmission>[]> => {
  const { data: submissionData, error: submissionError } = await supabase
    .from('form_submission')
    .select()
    .eq('form_id', form_id);

  if (!submissionData || submissionError) {
    throw new Error(
      `Error fetching submission data: ${submissionError.message}`
    );
  }

  return submissionData;
};

export const getQuestionResponse = async (
  supabase: SupabaseClient,
  form_submission_id: string
): Promise<z.infer<typeof QuestionResponse>[]> => {
  const { data: responseData, error: responseError } = await supabase
    .from('question_response')
    .select()
    .eq('form_submission_id', form_submission_id);

  if (!responseData || responseError) {
    throw new Error(
      `Error fetching question responses: ${responseError.message}`
    );
  }
  return responseData;
};

export const getResponseOptionSelection = async (
  supabase: SupabaseClient,
  form_submission_id: string
): Promise<z.infer<typeof ResponseOptionSelection>[]> => {
  const { data: responseOptionData, error: responseOptionError } =
    await supabase
      .from('response_option_selection')
      .select()
      .eq('form_submission_id', form_submission_id);

  if (!responseOptionData || responseOptionError) {
    throw new Error(
      `Error fetching question options responses: ${responseOptionError}`
    );
  }

  return responseOptionData;
};
