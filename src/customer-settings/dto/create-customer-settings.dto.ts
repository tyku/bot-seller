import { z } from 'zod';

export const botStatuses = ['created', 'active', 'archived'] as const;

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

export const UpdateCustomerSettingsSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name must be at most 100 characters long')
    .optional(),
  token: z.string().min(1, 'Token is required').optional(),
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