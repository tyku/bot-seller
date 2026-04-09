import { z } from 'zod';

export const UpdateSystemPromptTextSchema = z.object({
  text: z.string(),
});

export type UpdateSystemPromptTextDto = z.infer<typeof UpdateSystemPromptTextSchema>;
