import { z } from 'zod';

export const Challenges = z.object({
  id: z.string(),
  family_tree_id: z.string(),
  prompt: z.string(),
  point_value: z.number().nullable().optional(),
  deadline: z.string().optional(),
  created_at: z.string()
});

export type Challenges = z.infer<typeof Challenges>;
