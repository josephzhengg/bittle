import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { FamilyTree } from '@/utils/supabase/models/family-tree';
import { Group } from '@/utils/supabase/models/group';
import { TreeMember } from '@/utils/supabase/models/tree-member';
import { FormSubmission } from '@/utils/supabase/models/form-submission';

// Constants for grid-based positioning (aligned with FamilyTreeFlow.tsx)
const NODE_WIDTH = 172;
const NODE_HEIGHT = 36;
const GROUP_WIDTH = 300;
const GROUP_HEIGHT = 200;
const PADDING = 50;

// Estimated viewport size for centering (adjustable)
const VIEWPORT_WIDTH = 1280; // Typical default viewport width
const VIEWPORT_HEIGHT = 720 * 0.85; // 85% of 720px, matching FamilyTreeFlow.tsx's height: 85vh

// Utility to calculate centered positions for members within a group
const calculateMemberPositions = (
  members: { identifier: string; form_submission_id?: string | null }[],
  groupPosition: { x: number; y: number },
  groupWidth: number,
  groupHeight: number
): { position_x: number; position_y: number }[] => {
  const positions: { position_x: number; position_y: number }[] = [];
  const maxPerRow = Math.floor(groupWidth / (NODE_WIDTH + PADDING));
  const offsetX =
    (groupWidth - maxPerRow * (NODE_WIDTH + PADDING) + PADDING) / 2;
  const offsetY = PADDING;

  members.forEach((_, index) => {
    const row = Math.floor(index / maxPerRow);
    const col = index % maxPerRow;
    const position_x = offsetX + col * (NODE_WIDTH + PADDING);
    const position_y = offsetY + row * (NODE_HEIGHT + PADDING);
    // Ensure positions are within group boundaries
    positions.push({
      position_x: Math.min(
        Math.max(position_x, PADDING),
        groupWidth - NODE_WIDTH - PADDING
      ),
      position_y: Math.min(
        Math.max(position_y, PADDING),
        groupHeight - NODE_HEIGHT - PADDING
      )
    });
  });

  return positions;
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
      group_id?: string;
      form_submission_id?: string | null;
    }[];
  }
): Promise<z.infer<typeof FamilyTree>> {
  // Check for existing family tree by form_id
  const existingTree = await checkExistingFamilyTree(supabase, input.form_id);
  if (existingTree) {
    throw new Error(`Family tree already exists for form ID: ${input.form_id}`);
  }

  // Check for existing family tree by code
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
    // Start a transaction to ensure atomicity
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

    // Create a default group at the estimated viewport center
    const groupX = (VIEWPORT_WIDTH - GROUP_WIDTH) / 2; // Center horizontally
    const groupY = (VIEWPORT_HEIGHT - GROUP_HEIGHT) / 2; // Center vertically
    const { data: groupData, error: groupError } = await supabase
      .from('group')
      .insert({
        family_tree_id: familyTree.id,
        position_x: groupX,
        position_y: groupY,
        width: `${GROUP_WIDTH}px`,
        height: `${GROUP_HEIGHT}px`
      })
      .select()
      .single();
    if (groupError) {
      throw new Error(`Error creating default group: ${groupError.message}`);
    }
    const defaultGroup = Group.parse(groupData);

    // Fetch question responses if no members provided
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

    // Calculate positions for members within the default group
    const memberPositions = calculateMemberPositions(
      members,
      {
        x: defaultGroup.position_x ?? groupX,
        y: defaultGroup.position_y ?? groupY
      },
      GROUP_WIDTH,
      GROUP_HEIGHT
    );

    // Insert tree members with relative positions in the default group
    const treeMembers = members.map((member, index) => ({
      family_tree_id: familyTree.id,
      identifier: member.identifier,
      form_submission_id: member.form_submission_id ?? null,
      group_id: member.group_id ?? defaultGroup.id, // Use provided group_id or default group
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

    // Create connections for big-little relationships
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

// Get family tree by ID
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

// Get family tree members
export async function getFamilyTreeMembers(
  supabase: SupabaseClient,
  familyTreeId: string
): Promise<z.infer<typeof TreeMember>[]> {
  const { data, error } = await supabase
    .from('tree_member')
    .select(
      'id, family_tree_id, identifier, form_submission_id, group_id, is_big, position_x, position_y'
    )
    .eq('family_tree_id', familyTreeId);
  if (error) throw new Error(`Error fetching members: ${error.message}`);
  return data;
}

// Create a new group
export async function createGroup(
  supabase: SupabaseClient,
  familyTreeId: string
): Promise<z.infer<typeof Group>[]> {
  const { data, error } = await supabase
    .from('group')
    .insert([
      {
        family_tree_id: familyTreeId,
        position_x: 100,
        position_y: 100,
        width: '300px',
        height: '200px'
      }
    ])
    .select();
  if (error) throw new Error(`Error creating group: ${error.message}`);
  return data;
}

// Create a big-little connection
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
  return data;
}

// Remove a big-little connection
export async function removeConnection(
  supabase: SupabaseClient,
  littleId: string
): Promise<void> {
  const { error } = await supabase
    .from('connections')
    .delete()
    .eq('little_id', littleId);
  if (error) throw new Error(`Error removing connection: ${error.message}`);
}

// Delete a family tree
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

// Get family trees by author
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

// Update family tree title and description
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

// Check for existing family tree by form_id
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

// Refetch form submissions for a family tree
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

// Toggle is_big status for a member
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

// Get family tree by code
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
