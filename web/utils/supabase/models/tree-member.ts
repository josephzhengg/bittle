import { z } from 'zod';

export const TreeMember = z.object({
  id: z.string(),
  family_tree_id: z.string(),
  identifier: z.string(),
  is_big: z.boolean().optional(),
  group_id: z.string().optional(),
  form_submission_id: z.string(),
  big: z.string().optional()
});

export type TreeMember = z.infer<typeof TreeMember>;
