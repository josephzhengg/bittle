import { z } from 'zod';

export const QuestionResponse = z.object({
  id: z.string(),
  form_id: z.string(),
  question_id: z.string(),
  free_text: z.string().nullable()
});

export type QuestionResponse = z.infer<typeof QuestionResponse>;
