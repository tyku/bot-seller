import { z } from 'zod';

// Регистрация через Email
export const RegisterEmailSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
});

export type RegisterEmailDto = z.infer<typeof RegisterEmailSchema>;

// Регистрация через Telegram (phone)
export const RegisterTelegramSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
});

export type RegisterTelegramDto = z.infer<typeof RegisterTelegramSchema>;

// Union type для обратной совместимости
export type RegisterDto = RegisterEmailDto | RegisterTelegramDto;
