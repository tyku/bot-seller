import { z } from 'zod';

export const PromptSchema = z.object({
  name: z.string().min(1, 'Prompt name is required'),
  body: z.string().min(1, 'Prompt body is required'),
  type: z.literal('context'),
});

export const CreateCustomerSettingsSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name must be at most 100 characters long'),
  token: z.string().min(1, 'Token is required'),
  botType: z.enum(['tg', 'vk'], {
    message: 'Bot type must be either "tg" or "vk"',
  }),
  prompts: z.array(PromptSchema).default([]),
});

export type CreateCustomerSettingsDto = z.infer<typeof CreateCustomerSettingsSchema>;
