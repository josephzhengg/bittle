import { z } from 'zod';

export const Connections = z.object({
  id: z.string(),
  family_tree_id: z.string(),
  big_id: z.string(),
  little_id: z.string(),
  points: z.number().nullable().optional()
});

export type Connections = z.infer<typeof Connections>;
