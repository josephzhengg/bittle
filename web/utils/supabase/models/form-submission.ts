import { z } from 'zod';

export const FormSubmission = z.object({
  id: z.string(),
  question_id: z.string(),
  form_id: z.string(),
  created_at: z.date({ coerce: true })
});
export type FormSubmission = z.infer<typeof FormSubmission>;
