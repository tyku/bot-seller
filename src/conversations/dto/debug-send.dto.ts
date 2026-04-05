import { z } from 'zod';

export const DebugSendSchema = z.object({
  botId: z.string().min(1, 'botId обязателен'),
  message: z.string().min(1, 'Введите сообщение'),
});

export type DebugSendDto = z.infer<typeof DebugSendSchema>;

export const DebugResetModeSchema = z.object({
  botId: z.string().min(1, 'botId обязателен'),
});

export type DebugResetModeDto = z.infer<typeof DebugResetModeSchema>;
