import { z } from "zod";

export const Form = z.object({
    id: z.string(),
    author: z.string(),
    created_at: z.date({ coerce: true }),
    deadline: z.date({ coerce: true }).nullable(),
    code: z.string()
})

export type Form = z.infer<typeof Form>