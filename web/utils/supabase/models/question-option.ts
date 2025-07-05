import { z } from 'zod';

export const QuestionOption = z.object({
  id: z.string(),
  question_id: z.string(),
  label: z.string()
});

export type QuestionOption = z.infer<typeof QuestionOption>;
