import { z } from 'zod';

export const TreeMember = z.object({
  id: z.string(),
  family_tree_id: z.string(),
  identifier: z.string(),
  form_submission_id: z.string().nullable(),
  is_big: z.boolean().nullable(),
  position_x: z.number().nullable().default(100),
  position_y: z.number().nullable().default(100)
});

export type TreeMember = z.infer<typeof TreeMember>;
