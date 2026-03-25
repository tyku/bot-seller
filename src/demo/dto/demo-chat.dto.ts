import { z } from 'zod';

export const DemoChatSendSchema = z.object({
  message: z.string().min(1, 'Введите сообщение').max(4000),
});

export type DemoChatSendDto = z.infer<typeof DemoChatSendSchema>;
