import { z } from 'zod';

export const InboxListQuerySchema = z.object({
  /** Канал: только реальные мессенджеры (не test). */
  platform: z.enum(['tg', 'vk']).optional(),
  page: z.coerce.number().int().min(0).optional().default(0),
  limit: z.coerce.number().int().min(1).max(100).optional().default(30),
});

export type InboxListQueryDto = z.infer<typeof InboxListQuerySchema>;

export const InboxOperatorSendSchema = z.object({
  message: z.string().min(1, 'Введите сообщение').max(4000),
});

export type InboxOperatorSendDto = z.infer<typeof InboxOperatorSendSchema>;

export const InboxControlModeSchema = z.object({
  controlMode: z.enum(['bot', 'operator']),
});

export type InboxControlModeDto = z.infer<typeof InboxControlModeSchema>;
