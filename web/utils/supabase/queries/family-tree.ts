import { z } from 'zod';
import { TreeMember } from '@/utils/supabase/models/tree-member';
import { SupabaseClient } from '@supabase/supabase-js';
import { Group } from '@/utils/supabase/models/group';
import { FamilyTree } from '../models/family-tree';
import { FormSubmission } from '../models/form-submission';

export const getFamilyTrees = async (
  supabase: SupabaseClient,
  author_id: string
): Promise<z.infer<typeof FamilyTree>[]> => {
  const { data: familyTrees, error: familyTreesError } = await supabase
    .from('family_tree')
    .select()
    .eq('author_id', author_id);

  if (familyTreesError) {
    throw new Error(
      `Error fetching family trees: ${familyTreesError?.message}`
    );
  }

  return familyTrees || [];
};

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
  code: string,
  author_id: string
): Promise<z.infer<typeof FamilyTree>> => {
  const existingTree = await checkExistingFamilyTree(supabase, form_id);

  if (existingTree) {
    throw new Error(`Family tree already exists for form ID: ${form_id}`);
  }

  try {
    const existingTreeByCode = await getFamilyTreeByCode(supabase, code);
    if (existingTreeByCode) {
      throw new Error(`Family tree with code "${code}" already exists`);
    }
  } catch (error) {
    if (
      error instanceof Error &&
      !error.message.includes('Error fetching family tree by code')
    ) {
      throw error;
    }
  }

  const { data: familyTreeData, error: familyTreeError } = await supabase
    .from('family_tree')
    .insert({ form_id, question_id, title, code, author_id })
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

export const updateFamilyTree = async (
  supabase: SupabaseClient,
  family_tree_id: string,
  title: string,
  description: string
): Promise<void> => {
  const { error: updateError } = await supabase
    .from('family_tree')
    .update({ title: title, description: description })
    .eq('family_tree_id', family_tree_id)
    .single();

  if (updateError) {
    throw new Error(`Error updating family tree: ${updateError.message}`);
  }
};

export const checkExistingFamilyTree = async (
  supabase: SupabaseClient,
  form_id: string
): Promise<z.infer<typeof FamilyTree> | null> => {
  const { data: familyTreeData, error: familyTreeError } = await supabase
    .from('family_tree')
    .select('*')
    .eq('form_id', form_id)
    .single();

  if (!familyTreeData) {
    return null;
  }

  if (familyTreeError && familyTreeError.code !== 'PGRST116') {
    throw new Error(
      `Error checking existing family tree: ${familyTreeError.message}`
    );
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

export const refetchSubmissions = async (
  supabase: SupabaseClient,
  family_tree_id: string
): Promise<z.infer<typeof FormSubmission>[]> => {
  const { data: familyTree, error: familyTreeError } = await supabase
    .from('family_tree')
    .select('form_id')
    .eq('id', family_tree_id)
    .single();

  if (!familyTree || familyTreeError) {
    throw new Error(`Error fetching family tree: ${familyTreeError?.message}`);
  }

  const { data: submissionData, error: submissionError } = await supabase
    .from('form_submission')
    .select()
    .eq('form_id', familyTree.form_id);

  if (!submissionData || submissionError) {
    throw new Error(
      `Error fetching form submissions: ${submissionError?.message}`
    );
  }

  return submissionData;
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

export const getFamilyTreeByCode = async (
  supabase: SupabaseClient,
  code: string
): Promise<z.infer<typeof FamilyTree>> => {
  const { data: familyTreeData, error: familyTreeError } = await supabase
    .from('family_tree')
    .select('*')
    .eq('code', code)
    .single();

  if (!familyTreeData || familyTreeError) {
    throw new Error(
      `Error fetching family tree by code: ${familyTreeError?.message}`
    );
  }

  return familyTreeData;
};

export const deleteFamilyTree = async (
  supabase: SupabaseClient,
  family_tree_id: string
): Promise<void> => {
  const { error: deleteError } = await supabase
    .from('family_tree')
    .delete()
    .eq('id', family_tree_id);

  if (deleteError) {
    throw new Error(`Error deleting family tree: ${deleteError.message}`);
  }
};
