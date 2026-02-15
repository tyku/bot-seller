import { z } from 'zod';

export const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  verificationMethod: z.enum(['email', 'telegram', 'sms']),
  telegramUsername: z.string().optional(),
}).refine(
  (data) => data.email || data.phone,
  {
    message: 'Either email or phone must be provided',
    path: ['email', 'phone'],
  }
).refine(
  (data) => {
    // If verificationMethod is email, email must be provided
    if (data.verificationMethod === 'email' && !data.email) {
      return false;
    }
    // If verificationMethod is sms, phone must be provided
    if (data.verificationMethod === 'sms' && !data.phone) {
      return false;
    }
    return true;
  },
  {
    message: 'Email is required for email verification, phone is required for SMS verification',
  }
);

export type RegisterDto = z.infer<typeof RegisterSchema>;
