import { z } from 'zod';

export const ResponseOptionSelection = z.object({
  response_id: z.string(),
  option_id: z.string(),
  label: z.string(),
  form_submission_id: z.string()
});

export type ResponseOptionSelection = z.infer<typeof ResponseOptionSelection>;
