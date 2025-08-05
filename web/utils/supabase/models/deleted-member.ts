import { z } from 'zod';

export const deletedMember = z.object({
  id: z.string(),
  submission_id: z.string(),
  family_tree_id: z.string()
});

export type DeletedMember = z.infer<typeof deletedMember>;
