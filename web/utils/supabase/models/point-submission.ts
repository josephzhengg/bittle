import { z } from 'zod';

export const PointSubmission = z.object({
  id: z.string(),
  connection_id: z.string(),
  prompt: z.string().nullable().optional(),
  point: z.number().nullable().optional(),
  challenge_id: z.string().nullable().optional()
});

export type PointSubmission = z.infer<typeof PointSubmission>;
