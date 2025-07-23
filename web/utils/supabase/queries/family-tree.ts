import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { FamilyTree } from '@/utils/supabase/models/family-tree';
import { TreeMember } from '@/utils/supabase/models/tree-member';
import { FormSubmission } from '@/utils/supabase/models/form-submission';
import { Connections } from '../models/connection';

const NODE_WIDTH = 172;
const NODE_HEIGHT = 36;
const PADDING = 50;
const VIEWPORT_WIDTH = 1280;
const VIEWPORT_HEIGHT = 720 * 0.85;

const calculateMemberPositions = (
  members: { identifier: string; form_submission_id?: string | null }[],
  containerWidth: number,
  containerHeight: number
): { position_x: number; position_y: number }[] => {
  const positions: { position_x: number; position_y: number }[] = [];
  const maxPerRow = Math.floor(containerWidth / (NODE_WIDTH + PADDING));
  const offsetX =
    (containerWidth - maxPerRow * (NODE_WIDTH + PADDING) + PADDING) / 2;
  const offsetY = PADDING;

  members.forEach((_, index) => {
    const row = Math.floor(index / maxPerRow);
    const col = index % maxPerRow;
    const position_x = offsetX + col * (NODE_WIDTH + PADDING);
    const position_y = offsetY + row * (NODE_HEIGHT + PADDING);
    positions.push({
      position_x: Math.min(position_x, containerWidth - NODE_WIDTH - PADDING),
      position_y: Math.min(position_y, containerHeight - NODE_HEIGHT - PADDING)
    });
  });

  return positions;
};

export const getConnections = async (
  supabase: SupabaseClient,
  family_tree_id: string
): Promise<z.infer<typeof Connections>[]> => {
  const { data, error } = await supabase
    .from('connections')
    .select()
    .eq('family_tree_id', family_tree_id);

  if (!data || error) {
    throw new Error(`Error fetching connections: ${error?.message}`);
  }

  return data;
};

export const getIdentifier = async (
  supabase: SupabaseClient,
  member_id: string
): Promise<string> => {
  const { data, error } = await supabase
    .from('tree_member')
    .select('id, identifier')
    .eq('id', member_id)
    .single();

  if (error || !data) {
    console.error(
      `Error fetching identifier for member_id ${member_id}:`,
      error,
      data
    );
    throw new Error(`Error fetching identifier: ${error?.message}`);
  }

  if (!data.identifier) {
    console.warn(`Identifier missing for member_id ${member_id}:`, data);
  }

  return data.identifier;
};

export async function createFamilyTree(
  supabase: SupabaseClient,
  input: {
    form_id: string;
    question_id: string;
    title: string;
    code: string;
    description?: string;
    author_id: string;
    members?: {
      identifier: string;
      is_big?: boolean;
      littles?: string[];
      form_submission_id?: string | null;
    }[];
  }
): Promise<z.infer<typeof FamilyTree>> {
  const existingTree = await checkExistingFamilyTree(supabase, input.form_id);
  if (existingTree) {
    throw new Error(`Family tree already exists for form ID: ${input.form_id}`);
  }

  try {
    const existingTreeByCode = await getFamilyTreeByCode(supabase, input.code);
    if (existingTreeByCode) {
      throw new Error(`Family tree with code "${input.code}" already exists`);
    }
  } catch (error) {
    if (
      error instanceof Error &&
      !error.message.includes('Error fetching family tree by code')
    ) {
      throw error;
    }
  }

  try {
    const { data: familyTreeData, error: familyTreeError } = await supabase
      .from('family_tree')
      .insert({
        form_id: input.form_id,
        question_id: input.question_id,
        title: input.title,
        code: input.code,
        description: input.description,
        author_id: input.author_id
      })
      .select()
      .single();
    if (familyTreeError) {
      throw new Error(`Error creating family tree: ${familyTreeError.message}`);
    }
    const familyTree = FamilyTree.parse(familyTreeData);

    let members = input.members || [];
    if (!members.length) {
      const { data: responseData, error: responseError } = await supabase
        .from('question_response')
        .select('free_text, form_submission_id')
        .eq('form_id', input.form_id)
        .eq('question_id', input.question_id);
      if (responseError) {
        throw new Error(
          `Error fetching question responses: ${responseError.message}`
        );
      }
      members = responseData.map((response) => ({
        identifier: response.free_text,
        form_submission_id: response.form_submission_id
      }));
    }

    const memberPositions = calculateMemberPositions(
      members,
      VIEWPORT_WIDTH,
      VIEWPORT_HEIGHT
    );

    const treeMembers = members.map((member, index) => ({
      family_tree_id: familyTree.id,
      identifier: member.identifier,
      form_submission_id: member.form_submission_id ?? null,
      is_big: member.is_big ?? false,
      position_x: memberPositions[index].position_x,
      position_y: memberPositions[index].position_y
    }));

    const { data: membersData, error: membersError } = await supabase
      .from('tree_member')
      .insert(treeMembers)
      .select();
    if (membersError) {
      throw new Error(`Error inserting tree members: ${membersError.message}`);
    }
    const parsedMembers = TreeMember.array().parse(membersData);

    const connections = members
      .flatMap((member, index) =>
        (member.littles || []).map((littleIdentifier) => ({
          big_id: parsedMembers[index].id,
          little_id: parsedMembers.find(
            (m) => m.identifier === littleIdentifier
          )?.id,
          family_tree_id: familyTree.id
        }))
      )
      .filter((conn) => conn.big_id && conn.little_id);

    if (connections.length > 0) {
      const { error: connectionsError } = await supabase
        .from('connections')
        .insert(connections);
      if (connectionsError) {
        throw new Error(
          `Error creating connections: ${connectionsError.message}`
        );
      }
    }

    return familyTree;
  } catch (error) {
    console.error('Error creating family tree:', error);
    throw error;
  }
}

export async function getFamilyTreeById(
  supabase: SupabaseClient,
  familyTreeId: string
): Promise<z.infer<typeof FamilyTree>> {
  const { data, error } = await supabase
    .from('family_tree')
    .select('*')
    .eq('id', familyTreeId)
    .single();
  if (error) throw new Error(`Error fetching family tree: ${error.message}`);
  return data;
}

export async function getFamilyTreeMembers(
  supabase: SupabaseClient,
  familyTreeId: string
): Promise<z.infer<typeof TreeMember>[]> {
  const { data, error } = await supabase
    .from('tree_member')
    .select()
    .eq('family_tree_id', familyTreeId);
  if (error) throw new Error(`Error fetching members: ${error.message}`);
  return data;
}

export async function createConnection(
  supabase: SupabaseClient,
  bigId: string,
  littleId: string
) {
  const { data: memberData, error: memberError } = await supabase
    .from('tree_member')
    .select('family_tree_id')
    .eq('id', bigId)
    .single();
  if (memberError)
    throw new Error(`Error fetching member: ${memberError.message}`);

  const { data, error } = await supabase
    .from('connections')
    .insert([
      {
        big_id: bigId,
        little_id: littleId,
        family_tree_id: memberData.family_tree_id
      }
    ])
    .select();
  if (error) throw new Error(`Error creating connection: ${error.message}`);

  const { error: updateError } = await supabase
    .from('tree_member')
    .update({ is_big: true })
    .eq('id', bigId);
  if (updateError) {
    throw new Error(`Error updating member to big: ${updateError.message}`);
  }
  return data;
}

export async function removeConnection(
  supabase: SupabaseClient,
  littleId: string,
  bigId: string
): Promise<void> {
  const { error } = await supabase
    .from('connections')
    .delete()
    .eq('little_id', littleId)
    .eq('big_id', bigId);
  if (error) throw new Error(`Error removing connection: ${error.message}`);

  const { data: littleData, error: littleError } = await supabase
    .from('connections')
    .select('id')
    .eq('big_id', bigId);

  if (littleError) {
    throw new Error(
      `Error fetching little connections: ${littleError.message}`
    );
  }
  if (littleData.length === 0) {
    const { error: updateError } = await supabase
      .from('tree_member')
      .update({ is_big: false })
      .eq('id', bigId);
    if (updateError) {
      throw new Error(
        `Error updating member to not big: ${updateError.message}`
      );
    }
  }
}

export async function deleteFamilyTree(
  supabase: SupabaseClient,
  family_tree_id: string
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('family_tree')
    .delete()
    .eq('id', family_tree_id);
  if (deleteError)
    throw new Error(`Error deleting family tree: ${deleteError.message}`);
}

export async function getFamilyTrees(
  supabase: SupabaseClient,
  author_id: string
): Promise<z.infer<typeof FamilyTree>[]> {
  const { data: familyTrees, error: familyTreesError } = await supabase
    .from('family_tree')
    .select('*')
    .eq('author_id', author_id);
  if (familyTreesError) {
    throw new Error(`Error fetching family trees: ${familyTreesError.message}`);
  }
  return familyTrees || [];
}

export async function updateFamilyTree(
  supabase: SupabaseClient,
  family_tree_id: string,
  title: string,
  description: string
): Promise<void> {
  const { error: updateError } = await supabase
    .from('family_tree')
    .update({ title, description })
    .eq('id', family_tree_id);
  if (updateError)
    throw new Error(`Error updating family tree: ${updateError.message}`);
}

export async function checkExistingFamilyTree(
  supabase: SupabaseClient,
  form_id: string
): Promise<z.infer<typeof FamilyTree> | null> {
  const { data: familyTreeData, error: familyTreeError } = await supabase
    .from('family_tree')
    .select('*')
    .eq('form_id', form_id)
    .single();
  if (!familyTreeData || familyTreeError?.code === 'PGRST116') {
    return null;
  }
  if (familyTreeError) {
    throw new Error(
      `Error checking existing family tree: ${familyTreeError.message}`
    );
  }
  return familyTreeData;
}

export async function refetchSubmissions(
  supabase: SupabaseClient,
  family_tree_id: string
): Promise<z.infer<typeof FormSubmission>[]> {
  const { data: familyTree, error: familyTreeError } = await supabase
    .from('family_tree')
    .select('form_id')
    .eq('id', family_tree_id)
    .single();
  if (familyTreeError) {
    throw new Error(`Error fetching family tree: ${familyTreeError.message}`);
  }

  const { data: submissionData, error: submissionError } = await supabase
    .from('form_submission')
    .select('*')
    .eq('form_id', familyTree.form_id);
  if (submissionError) {
    throw new Error(
      `Error fetching form submissions: ${submissionError.message}`
    );
  }
  return submissionData || [];
}

export async function toggleBig(
  supabase: SupabaseClient,
  member_id: string,
  is_big: boolean
): Promise<void> {
  const { error: updateError } = await supabase
    .from('tree_member')
    .update({ is_big })
    .eq('id', member_id);
  if (updateError)
    throw new Error(`Error toggling big status: ${updateError.message}`);
}

export async function getFamilyTreeByCode(
  supabase: SupabaseClient,
  code: string
): Promise<z.infer<typeof FamilyTree>> {
  const { data: familyTreeData, error: familyTreeError } = await supabase
    .from('family_tree')
    .select('*')
    .eq('code', code)
    .single();
  if (familyTreeError) {
    throw new Error(
      `Error fetching family tree by code: ${familyTreeError.message}`
    );
  }
  return familyTreeData;
}

export async function updateIdentifier(
  supabase: SupabaseClient,
  member_id: string,
  new_identifier: string
): Promise<void> {
  const { error } = await supabase
    .from('tree_member')
    .update({ identifier: new_identifier })
    .eq('id', member_id);
  if (error) {
    throw new Error(`Error updating identifier: ${error.message}`);
  }
}

export async function createFamilyMember(
  supabase: SupabaseClient,
  family_tree_id: string,
  identifier: string
): Promise<z.infer<typeof TreeMember>> {
  const { data, error } = await supabase
    .from('tree_member')
    .insert({
      family_tree_id,
      identifier,
      position_x: NODE_WIDTH / 2 + PADDING,
      position_y: NODE_HEIGHT / 2 + PADDING
    })
    .select()
    .single();
  if (error) {
    throw new Error(`Error creating family member: ${error.message}`);
  }
  return data;
}
