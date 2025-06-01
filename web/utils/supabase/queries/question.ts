import { SupabaseClient } from '@supabase/supabase-js';
import { Question } from '../models/question';
import { z } from 'zod';
import { QuestionOption } from '../models/question-option';

export const createTemplateQuestions = async (
  supabase: SupabaseClient,
  form_id: string
): Promise<void> => {
  const payloadFRQuestion = {
    prompt: 'What is your name?',
    form_id: form_id,
    type: 'FREE_RESPONSE',
    index: 1
  };

  const payloadMCQuestion = {
    prompt: 'What year are you?',
    form_id: form_id,
    type: 'MULTIPLE_CHOICE',
    index: 2
  };

  const payloadSAQuestion = {
    prompt: 'From these choices, what might you say about your vibe?',
    form_id: form_id,
    type: 'SELECT_ALL',
    index: 3
  };

  const { data: insertedQuestions, error: insertError } = await supabase
    .from('question')
    .insert([payloadFRQuestion, payloadMCQuestion, payloadSAQuestion])
    .select();

  if (insertError) {
    throw new Error(
      `Error creating template questions: ${insertError.message}`
    );
  }

  const { data: questionData, error: questionError } = await supabase
    .from('question')
    .select('*')
    .eq('form_id', form_id);

  if (!questionData || questionError) {
    throw new Error(
      `Error fetching template questions: ${questionError.message}`
    );
  }

  const mcQuestion = insertedQuestions.find(
    (q) => q.type === 'MULTIPLE_CHOICE'
  );
  const saQuestion = insertedQuestions.find((q) => q.type === 'SELECT_ALL');

  if (mcQuestion) {
    const mcQuestionOptions = [
      {
        question_id: mcQuestion.id,
        label: 'Freshman',
        index: 1
      },
      {
        question_id: mcQuestion.id,
        label: 'Sophomore',
        index: 2
      },
      {
        question_id: mcQuestion.id,
        label: 'Junior',
        index: 3
      },
      {
        question_id: mcQuestion.id,
        label: 'Senior',
        index: 4
      }
    ];

    const { error: mcOptionsError } = await supabase
      .from('question_option')
      .insert(mcQuestionOptions);

    if (mcOptionsError) {
      throw new Error(
        `Error creating MC question options: ${mcOptionsError.message}`
      );
    }

    if (saQuestion) {
      const saQuestionOptions = [
        {
          question_id: saQuestion.id,
          label: 'Chill and laid-back',
          index: 1
        },
        {
          question_id: saQuestion.id,
          label: 'Energetic and outgoing',
          index: 2
        },
        {
          question_id: saQuestion.id,
          label: 'Creative and artistic',
          index: 3
        },
        {
          question_id: saQuestion.id,
          label: 'Academic and studious',
          index: 4
        }
      ];

      const { error: saOptionsError } = await supabase
        .from('question_option')
        .insert(saQuestionOptions);

      if (saOptionsError) {
        throw new Error(
          `Error creating SA question options: ${saOptionsError.message}`
        );
      }
    }
  }
};

export const getQuestions = async (
  supabase: SupabaseClient,
  form_id: string
): Promise<z.infer<typeof Question>[]> => {
  const { data: questionData, error: questionError } = await supabase
    .from('question')
    .select('*')
    .eq('form_id', form_id);

  if (!questionData || questionError) {
    throw new Error(`Error fetching questions: ${questionError?.message}`);
  }

  return questionData as z.infer<typeof Question>[];
};

export const getOptions = async (
  supabase: SupabaseClient,
  question_id: string
): Promise<z.infer<typeof QuestionOption>[]> => {
  const { data: optionData, error: optionError } = await supabase
    .from('question_option')
    .select('*')
    .eq('question_id', question_id);

  if (!optionData || optionError) {
    throw new Error(`Error fetching question options: ${optionError?.message}`);
  }

  return optionData as z.infer<typeof QuestionOption>[];
};

export const deleteQuestion = async (
  supabase: SupabaseClient,
  question_id: string
): Promise<void> => {
  const { error: deleteError } = await supabase
    .from('question')
    .delete()
    .eq('id', question_id);

  if (deleteError) {
    throw new Error(`Error deleting question: ${deleteError.message}`);
  }
};
