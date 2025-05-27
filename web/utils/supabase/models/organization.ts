import { z } from "zod";

export const Organization = z.object({
    id: z.string(),
    name: z.string(),
    affiliation: z.string().nullable()
})

export type Organization = z.infer<typeof Organization>