import { z } from 'zod';

// Регистрация через Email (только email)
export const RegisterEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export type RegisterEmailDto = z.infer<typeof RegisterEmailSchema>;

// Регистрация через Telegram (только phone)
export const RegisterTelegramSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
});

export type RegisterTelegramDto = z.infer<typeof RegisterTelegramSchema>;

// Union type
export type RegisterDto = RegisterEmailDto | RegisterTelegramDto;
