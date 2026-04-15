import { z } from 'zod';

export const botStatuses = ['created', 'active', 'archived'] as const;

export const PromptSchema = z.object({
  name: z.string().min(1, 'Prompt name is required'),
  body: z.string().min(1, 'Prompt body is required'),
  type: z.literal('context'),
});

export const CreateCustomerSettingsSchema = z
  .object({
    customerId: z.string().min(1, 'Customer ID is required'),
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters long')
      .max(100, 'Name must be at most 100 characters long'),
    /** Telegram: обязателен. VK: можно передать vkToken вместо token. */
    token: z.string().optional(),
    /** Групповой access token VK (альтернатива полю token для botType vk). */
    vkToken: z.string().optional(),
    /** Строка подтверждения Callback API (обязательна для VK). */
    vkConfirmationCode: z.string().optional(),
    /** Секрет Callback API в настройках сообщества (опционально). */
    vkCallbackSecret: z.string().optional(),
    botType: z.enum(['tg', 'vk'], {
      message: 'Bot type must be either "tg" or "vk"',
    }),
    prompts: z.array(PromptSchema).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.botType === 'tg') {
      const t = data.token?.trim();
      if (!t) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Token is required',
          path: ['token'],
        });
      }
    } else {
      const t = (data.vkToken ?? data.token)?.trim();
      if (!t) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'VK token is required',
          path: ['vkToken'],
        });
      }
      const c = data.vkConfirmationCode?.trim();
      if (!c) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'VK confirmation code is required',
          path: ['vkConfirmationCode'],
        });
      }
    }
  });

export const UpdateCustomerSettingsSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name must be at most 100 characters long')
    .optional(),
  token: z.string().min(1, 'Token is required').optional(),
  vkToken: z.string().min(1, 'VK token is required').optional(),
  vkConfirmationCode: z.string().min(1).optional(),
  vkCallbackSecret: z.string().optional(),
  botType: z.enum(['tg', 'vk'], {
    message: 'Bot type must be either "tg" or "vk"',
  }).optional(),
  status: z.enum(botStatuses, {
    message: 'Status must be "created", "active" or "archived"',
  }).optional(),
  prompts: z.array(PromptSchema).optional(),
});

export type CreateCustomerSettingsDto = z.infer<typeof CreateCustomerSettingsSchema>;
export type UpdateCustomerSettingsDto = z.infer<typeof UpdateCustomerSettingsSchema>;