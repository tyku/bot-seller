import { z } from 'zod';

export const CheckTelegramStatusSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
});

export type CheckTelegramStatusDto = z.infer<typeof CheckTelegramStatusSchema>;
