import { z } from 'zod';

export const Group = z.object({
  id: z.string(),
  family_tree_id: z.string()
});

export type Group = z.infer<typeof Group>;
