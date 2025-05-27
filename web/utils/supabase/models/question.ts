import { z } from "zod";

export const Question = z.object({
    id: z.string(),
    prompt: z.string(),
    form_id: z.string(),
    type: z.string() 

})

export type Question = z.infer<typeof Question>