import { z } from 'zod';
import { TreeMember } from '@/utils/supabase/models/tree-member';
import { SupabaseClient } from '@supabase/supabase-js';
import { Group } from '@/utils/supabase/models/group';
import { FamilyTree } from '../models/family-tree';

export const getFamilyTreeById = async (
  supabase: SupabaseClient,
  family_tree_id: string
): Promise<z.infer<typeof FamilyTree>> => {
  const { data: familyTreeData, error: familyTreeError } = await supabase
    .from('family_tree')
    .select('*')
    .eq('id', family_tree_id)
    .single();
  if (!familyTreeData || familyTreeError) {
    throw new Error(
      `Error fetching family tree by ID: ${familyTreeError?.message}`
    );
  }
  return familyTreeData;
};

export const createFamilyTree = async (
  supabase: SupabaseClient,
  form_id: string,
  question_id: string,
  title: string,
  code: string
): Promise<z.infer<typeof FamilyTree>> => {
  const { data: familyTreeData, error: familyTreeError } = await supabase
    .from('family_tree')
    .insert({ form_id, question_id, title, code })
    .select()
    .single();

  if (!familyTreeData || familyTreeError) {
    throw new Error(`Error creating family tree: ${familyTreeError?.message}`);
  }

  const { data: responseData, error: responseError } = await supabase
    .from('question_response')
    .select('free_text, form_submission_id')
    .eq('form_id', form_id)
    .eq('question_id', question_id);

  if (!responseData || responseError) {
    throw new Error(
      `Error fetching question responses or no responses found: ${responseError?.message}`
    );
  }

  for (const response of responseData) {
    const { error: memberError } = await supabase.from('tree_member').insert({
      family_tree_id: familyTreeData.id,
      identifier: response.free_text,
      form_submission_id: response.form_submission_id
    });
    if (memberError) {
      throw new Error(`Error inserting tree member: ${memberError.message}`);
    }
  }
  return familyTreeData;
};

export const getFamilyTreeMembers = async (
  supabase: SupabaseClient,
  family_tree_id: string
): Promise<z.infer<typeof TreeMember>[]> => {
  const { data: memberData, error: memberError } = await supabase
    .from('tree_member')
    .select('*')
    .eq('family_tree_id', family_tree_id);

  if (!memberData || memberError) {
    throw new Error(
      `Error fetching family tree members: ${memberError?.message}`
    );
  }
  return memberData;
};

export const createGroup = async (
  supabase: SupabaseClient,
  family_tree_id: string
): Promise<z.infer<typeof Group>[]> => {
  const { data: groupData, error: groupError } = await supabase
    .from('group')
    .insert({ family_tree_id })
    .select();

  if (!groupData || groupError) {
    throw new Error(`Error creating family group: ${groupError?.message}`);
  }

  return groupData;
};

export const createConnection = async (
  supabase: SupabaseClient,
  parent_id: string,
  child_id: string
): Promise<void> => {
  const { error: updateChildError } = await supabase
    .from('tree_member')
    .update({ big: parent_id })
    .eq('id', child_id);

  if (updateChildError) {
    throw new Error(
      `Error updating parent ID for child: ${updateChildError.message}`
    );
  }

  const { error: updateParentError } = await supabase
    .from('tree_member')
    .update({ is_big: true })
    .eq('id', parent_id);

  if (updateParentError) {
    throw new Error(
      `Error updating parent ID for parent: ${updateParentError.message}`
    );
  }
};

export const removeConnection = async (
  supabase: SupabaseClient,
  child_id: string
): Promise<void> => {
  const { error: updateError } = await supabase
    .from('tree_member')
    .update({ big: null })
    .eq('id', child_id);

  if (updateError) {
    throw new Error(`Error removing connection: ${updateError.message}`);
  }
};

export const toggleBig = async (
  supabase: SupabaseClient,
  member_id: string,
  is_big: boolean
): Promise<void> => {
  const { error: updateError } = await supabase
    .from('tree_member')
    .update({ is_big })
    .eq('id', member_id);

  if (updateError) {
    throw new Error(`Error toggling big status: ${updateError.message}`);
  }
};
