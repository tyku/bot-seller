import { z } from 'zod';

export const VerifyCodeSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional(),
  code: z.string().length(6, 'Verification code must be 6 digits'),
  method: z.enum(['email', 'telegram', 'sms']),
}).refine(
  (data) => data.email || data.phone,
  {
    message: 'Either email or phone must be provided',
    path: ['email', 'phone'],
  }
);

export type VerifyCodeDto = z.infer<typeof VerifyCodeSchema>;
