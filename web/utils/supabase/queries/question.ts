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

  const payloadBigLittleQuestion = {
    prompt: 'Do you want to be a big or little?',
    form_id: form_id,
    type: 'MULTIPLE_CHOICE',
    index: 3
  };

  const payloadHobbiesQuestion = {
    prompt: 'What are your hobbies?',
    form_id: form_id,
    type: 'SELECT_ALL',
    index: 4
  };

  const { data: insertedQuestions, error: insertError } = await supabase
    .from('question')
    .insert([
      payloadFRQuestion,
      payloadMCQuestion,
      payloadBigLittleQuestion,
      payloadHobbiesQuestion
    ])
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
    (q) => q.type === 'MULTIPLE_CHOICE' && q.prompt === 'What year are you?'
  );
  const bigLittleQuestion = insertedQuestions.find(
    (q) =>
      q.type === 'MULTIPLE_CHOICE' &&
      q.prompt === 'Do you want to be a big or little?'
  );
  const hobbiesQuestion = insertedQuestions.find(
    (q) => q.type === 'SELECT_ALL'
  );

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
      },
      {
        question_id: mcQuestion.id,
        label: 'Other',
        index: 5
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
  }

  if (bigLittleQuestion) {
    const bigLittleOptions = [
      {
        question_id: bigLittleQuestion.id,
        label: 'Big',
        index: 1
      },
      {
        question_id: bigLittleQuestion.id,
        label: 'Little',
        index: 2
      },
      {
        question_id: bigLittleQuestion.id,
        label: 'Both',
        index: 3
      }
    ];

    const { error: bigLittleOptionsError } = await supabase
      .from('question_option')
      .insert(bigLittleOptions);

    if (bigLittleOptionsError) {
      throw new Error(
        `Error creating big/little question options: ${bigLittleOptionsError.message}`
      );
    }
  }

  if (hobbiesQuestion) {
    const hobbiesOptions = [
      {
        question_id: hobbiesQuestion.id,
        label: 'Partying',
        index: 1
      },
      {
        question_id: hobbiesQuestion.id,
        label: 'Volleyball',
        index: 2
      },
      {
        question_id: hobbiesQuestion.id,
        label: 'Basketball',
        index: 3
      },
      {
        question_id: hobbiesQuestion.id,
        label: 'Soccer',
        index: 4
      },
      {
        question_id: hobbiesQuestion.id,
        label: 'Gaming',
        index: 5
      },
      {
        question_id: hobbiesQuestion.id,
        label: 'Reading',
        index: 6
      },
      {
        question_id: hobbiesQuestion.id,
        label: 'Music',
        index: 7
      },
      {
        question_id: hobbiesQuestion.id,
        label: 'Photography',
        index: 8
      },
      {
        question_id: hobbiesQuestion.id,
        label: 'Hiking',
        index: 9
      },
      {
        question_id: hobbiesQuestion.id,
        label: 'Cooking',
        index: 10
      },
      {
        question_id: hobbiesQuestion.id,
        label: 'Art/Drawing',
        index: 11
      },
      {
        question_id: hobbiesQuestion.id,
        label: 'Working out',
        index: 12
      },
      {
        question_id: hobbiesQuestion.id,
        label: 'Netflix/Movies',
        index: 13
      },
      {
        question_id: hobbiesQuestion.id,
        label: 'Dancing',
        index: 14
      },
      {
        question_id: hobbiesQuestion.id,
        label: 'Studying',
        index: 15
      }
    ];

    const { error: hobbiesOptionsError } = await supabase
      .from('question_option')
      .insert(hobbiesOptions);

    if (hobbiesOptionsError) {
      throw new Error(
        `Error creating hobbies question options: ${hobbiesOptionsError.message}`
      );
    }
  }
};

export const createQuestion = async (
  supabase: SupabaseClient,
  form_id: string,
  prompt: string,
  type: string,
  index: number,
  description?: string
): Promise<z.infer<typeof Question>> => {
  const payload = {
    prompt: prompt,
    form_id: form_id,
    type: type,
    index: index,
    description: description || null
  };

  const { data: questionData, error: questionError } = await supabase
    .from('question')
    .insert([payload])
    .select()
    .single();

  if (!questionData || questionError) {
    throw new Error(`Error creating question: ${questionError?.message}`);
  }
  return questionData;
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

export const createOption = async (
  supabase: SupabaseClient,
  question_id: string,
  options_payload: {
    question_id: string;
    label: string;
    index: number;
  }[]
): Promise<z.infer<typeof QuestionOption>[]> => {
  const { data: optionData, error: optionError } = await supabase
    .from('question_option')
    .insert(options_payload)
    .select();

  if (!optionData || optionError) {
    throw new Error(`Error creating question options: ${optionError.message}`);
  }

  return optionData;
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

export const reorderQuestions = async (
  supabase: SupabaseClient,
  questions: Question[]
): Promise<void> => {
  const updates = questions.map((q, i) => ({
    id: q.id,
    index: i + 1
  }));

  const { error: updateError } = await supabase
    .from('question')
    .upsert(updates, { onConflict: 'id' });

  if (updateError) {
    throw new Error(`Error updating indices: ${updateError.message}`);
  }
};

  export const updateQuestion = async (
    supabase: SupabaseClient,
    question_id: string,
    prompt: string,
    description?: string
  ): Promise<void> => {
    const updateData: { prompt: string; description?: string } = { prompt };
    if (description !== undefined) {
      updateData['description'] = description;
    }
    const { error: questionError } = await supabase
      .from('question')
      .update(updateData)
      .eq('id', question_id);

    if (questionError) {
      throw new Error(`Error updating question prompt: ${questionError.message}`);
    }
  };

export const updateOption = async (
  supabase: SupabaseClient,
  option_id: string,
  label: string
): Promise<void> => {
  const { error: optionError } = await supabase
    .from('question_option')
    .update({ label: label })
    .eq('id', option_id);

  if (optionError) {
    throw new Error(`Error updating option label: ${optionError.message}`);
  }
};

export const deleteOption = async (
  supabase: SupabaseClient,
  option_id: string
): Promise<void> => {
  const { error: deleteError } = await supabase
    .from('question_option')
    .delete()
    .eq('id', option_id);

  if (deleteError) {
    throw new Error(`Error deleting option: ${deleteError.message}`);
  }
};

export const getQuestion = async (
  supabase: SupabaseClient,
  question_id: string
): Promise<z.infer<typeof Question>> => {
  const { data: questionData, error: questionError } = await supabase
    .from('question')
    .select()
    .eq('id', question_id)
    .single();

  if (!questionData || questionError) {
    throw new Error(`Error getting question: ${questionError?.message}`);
  }
  return questionData;
};
