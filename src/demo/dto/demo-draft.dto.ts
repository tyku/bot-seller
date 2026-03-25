import { z } from 'zod';
import { PromptSchema } from '../../customer-settings/dto/create-customer-settings.dto';

export const UpdateDemoDraftSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name must be at most 100 characters long')
    .optional(),
  botType: z.enum(['tg', 'vk']).optional(),
  prompts: z.array(PromptSchema).optional(),
});

export const MergeDemoDraftSchema = z.object({
  draftId: z.string().uuid('Invalid draft id'),
  secret: z.string().min(1, 'Secret is required'),
  /** Реальный токен Telegram — только при переносе в аккаунт */
  token: z.string().min(1, 'Bot token is required'),
});

export type UpdateDemoDraftDto = z.infer<typeof UpdateDemoDraftSchema>;
export type MergeDemoDraftDto = z.infer<typeof MergeDemoDraftSchema>;
