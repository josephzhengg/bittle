import { z } from 'zod';

export const FamilyTree = z.object({
  id: z.string(),
  question_id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  form_id: z.string(),
  code: z.string(),
  author_id: z.string()
});

export type FamilyTree = z.infer<typeof FamilyTree>;
