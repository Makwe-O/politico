import { z } from 'zod';

export const Health = z.object({
  ok: z.boolean(),
  service: z.literal('politico-api'),
  time: z.string(),
});
export type Health = z.infer<typeof Health>;
