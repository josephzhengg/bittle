import { SupabaseClient } from '@supabase/supabase-js';
import { PointSubmission } from '@/utils/supabase/models/point-submission';
import { Challenges } from '@/utils/supabase/models/challenges';
import { z } from 'zod';

export const getPointSubmissions = async (
  supabase: SupabaseClient,
  challenge_id: string
): Promise<z.infer<typeof PointSubmission>[]> => {
  const { data, error } = await supabase
    .from('point_submission')
    .select('*')
    .eq('challenge_id', challenge_id);

  if (error) {
    throw new Error(`Error fetching point submissions: ${error.message}`);
  }

  return data;
};

export const getChallenges = async (
  supabase: SupabaseClient,
  family_tree_id: string
): Promise<z.infer<typeof Challenges>[]> => {
  const { data, error } = await supabase

    .from('challenges')
    .select('*')
    .eq('family_tree_id', family_tree_id);
  if (error) {
    throw new Error(`Error fetching challenges: ${error.message}`);
  }
  return data;
};

export const createChallenge = async (
  supabase: SupabaseClient,
  family_tree_id: string,
  prompt: string,
  point_value: number | null,
  deadline: Date | null
): Promise<void> => {
  const { error: insertError } = await supabase
    .from('challenges')
    .insert({ family_tree_id, prompt, point_value, deadline })
    .single();
  if (insertError) {
    throw new Error(`Error creating challenge: ${insertError.message}`);
  }
};

export const createPointSubmission = async (
  supabase: SupabaseClient,
  connection_id: string,
  prompt: string | null,
  point: number | null,
  challenge_id: string
): Promise<void> => {
  const { error: insertError } = await supabase
    .from('point_submission') // Changed from 'point_submission' to 'point_submission'
    .insert({ connection_id, prompt, point, challenge_id });

  if (insertError) {
    console.error('Insert error details:', insertError);
    throw new Error(`Error creating point submission: ${insertError.message}`);
  }

  const { data: connection, error: connectionError } = await supabase
    .from('connections')
    .select('points')
    .eq('id', connection_id)
    .single();

  if (connectionError || !connection) {
    console.error('Connection fetch error:', connectionError);
    throw new Error(`Error fetching connection: ${connectionError?.message}`);
  }

  const { error: updateError } = await supabase
    .from('connections')
    .update({ points: (connection.points || 0) + (point || 0) })
    .eq('id', connection_id);

  if (updateError) {
    console.error('Update error details:', updateError);
    throw new Error(`Error updating connection points: ${updateError.message}`);
  }
};

export const createPointSubmissionWithChallenge = async (
  supabase: SupabaseClient,
  connection_id: string,
  challenge_id: string
): Promise<void> => {
  try {
    // Fetch challenge
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', challenge_id)
      .single();

    if (challengeError || !challenge) {
      const errorMessage = challengeError
        ? `Error fetching challenge: ${challengeError.message}`
        : `Challenge with ID ${challenge_id} not found`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    // Insert point submission
    const { error: insertError } = await supabase
      .from('point_submission') // Changed from 'point_submission' to 'point_submission'
      .insert({
        connection_id,
        prompt: challenge.prompt,
        point: challenge.point_value,
        challenge_id: challenge.id
      });

    if (insertError) {
      console.error('Error inserting point submission:', insertError);
      throw new Error(
        `Error creating point submission: ${insertError.message}`
      );
    }

    // Fetch connection
    const { data: connection, error: connectionError } = await supabase
      .from('connections')
      .select('points')
      .eq('id', connection_id)
      .single();

    if (connectionError || !connection) {
      const errorMessage = connectionError
        ? `Error fetching connection: ${connectionError.message}`
        : `Connection with ID ${connection_id} not found`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    // Update connection points
    const { error: updateError } = await supabase
      .from('connections')
      .update({
        points: (connection.points || 0) + (challenge.point_value || 0)
      })
      .eq('id', connection_id);

    if (updateError) {
      console.error('Error updating connection points:', updateError);
      throw new Error(
        `Error updating connection points: ${updateError.message}`
      );
    }
  } catch (error) {
    console.error(
      'Unexpected error in createPointSubmissionWithChallenge:',
      error
    );
    throw error; // Re-throw to be caught by the caller
  }
};

export const deletePointSubmission = async (
  supabase: SupabaseClient,
  submission_id: string
): Promise<void> => {
  const { data: submission, error: submissionError } = await supabase
    .from('point_submission') // Changed from 'point_submission' to 'point_submission'
    .select('connection_id, point')
    .eq('id', submission_id)
    .single();

  if (submissionError || !submission) {
    throw new Error(
      `Error fetching point submission: ${submissionError?.message}`
    );
  }

  const { data: connection, error: connectionError } = await supabase
    .from('connections')
    .select('points')
    .eq('id', submission.connection_id)
    .single();

  if (connectionError || !connection) {
    throw new Error(`Error fetching connection: ${connectionError?.message}`);
  }

  const newPoints = (connection.points || 0) - (submission.point || 0);
  const { error: updateError } = await supabase
    .from('connections')
    .update({ points: newPoints })
    .eq('id', submission.connection_id);

  if (updateError) {
    throw new Error(`Error updating connection points: ${updateError.message}`);
  }

  const { error: deleteError } = await supabase
    .from('point_submission') // Keep consistent with 'point_submission'
    .delete()
    .eq('id', submission_id);

  if (deleteError) {
    throw new Error(`Error deleting point submission: ${deleteError.message}`);
  }
};

export const updateChallenge = async (
  supabase: SupabaseClient,
  challenge_id: string,
  prompt: string,
  point_value: number | null,
  deadline: Date | null
): Promise<void> => {
  const { error: updateError } = await supabase
    .from('challenges')
    .update({ prompt, point_value, deadline })
    .eq('id', challenge_id);

  if (updateError) {
    throw new Error(`Error updating challenge: ${updateError.message}`);
  }
};

export const deleteChallenge = async (
  supabase: SupabaseClient,
  challenge_id: string
): Promise<void> => {
  const { error: deleteError } = await supabase
    .from('challenges')
    .delete()
    .eq('id', challenge_id);

  if (deleteError) {
    throw new Error(`Error deleting challenge: ${deleteError.message}`);
  }
};
