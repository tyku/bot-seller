import { z } from 'zod';

export const UpdateUserSchema = z.object({
  firstName: z
    .string()
    .max(100)
    .optional(),

  lastName: z
    .string()
    .max(100)
    .optional(),

  username: z
    .string()
    .max(100)
    .optional(),

  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format (E.164)')
    .optional(),

  email: z
    .string()
    .email('Invalid email format')
    .toLowerCase()
    .optional(),

  languageCode: z
    .string()
    .max(10)
    .optional(),
});

export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
