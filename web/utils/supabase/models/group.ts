import { z } from 'zod';

export const Group = z.object({
  id: z.string(),
  family_tree_id: z.string(),
  position_x: z.number().nullable().default(100),
  position_y: z.number().nullable().default(100),
  width: z.string().nullable().default('300px'),
  height: z.string().nullable().default('200px')
});

export type Group = z.infer<typeof Group>;
