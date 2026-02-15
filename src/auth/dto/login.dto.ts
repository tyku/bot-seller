import { z } from 'zod';

// Login теперь только отправляет код, без пароля
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional(),
}).refine(
  (data) => data.email || data.phone,
  {
    message: 'Either email or phone must be provided',
    path: ['email', 'phone'],
  }
);

export type LoginDto = z.infer<typeof LoginSchema>;
