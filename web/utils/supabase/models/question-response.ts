import { z } from 'zod';

export const QuestionResponse = z.object({
  id: z.string(),
  form_id: z.string(),
  question_id: z.string(),
  free_text: z.string().nullable(),
  form_submission_id: z.string()
});

export type QuestionResponse = z.infer<typeof QuestionResponse>;
